-- ============================================================
--  Budget Tracker — схема бази даних (Supabase / PostgreSQL)
--  Виконай цей файл у Supabase → SQL Editor → New query.
--  Безпечно запускати повторно (idempotent).
-- ============================================================

-- ---------- Розширення ----------
create extension if not exists "pgcrypto";

-- ============================================================
--  Таблиці
-- ============================================================

-- Профіль користувача (1:1 з auth.users)
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  base_currency text not null default 'UAH',
  created_at    timestamptz not null default now()
);

-- Категорії витрат (parent_id != null → це підкатегорія)
create table if not exists public.expense_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  parent_id  uuid references public.expense_categories (id) on delete cascade,
  name       text not null,
  icon       text not null default 'Tag',     -- назва іконки lucide-react
  color      text not null default '#6366f1', -- HEX-колір
  created_at timestamptz not null default now()
);
-- Для вже створеної БД:
alter table public.expense_categories
  add column if not exists parent_id uuid references public.expense_categories (id) on delete cascade;

-- Витрати
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.expense_categories (id) on delete set null,
  amount      numeric(14, 2) not null check (amount >= 0),
  currency    text not null default 'UAH',
  spent_at    date not null default current_date,
  comment     text,
  created_at  timestamptz not null default now()
);

-- Категорії активів (тип: investment | safety | cash | custom)
create table if not exists public.asset_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  type       text not null default 'custom'
             check (type in ('investment', 'safety', 'cash', 'custom')),
  icon       text not null default 'Wallet',
  color      text not null default '#10b981',
  created_at timestamptz not null default now()
);

-- Активи
create table if not exists public.assets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.asset_categories (id) on delete set null,
  name        text not null,
  value       numeric(14, 2) not null default 0,
  currency    text not null default 'UAH',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Снапшоти Net Worth (для графіка росту капіталу)
create table if not exists public.net_worth_snapshots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  snapshot_date date not null default current_date,
  total_value   numeric(14, 2) not null default 0,
  currency      text not null default 'UAH',
  created_at    timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

-- Місячні бюджети за категоріями (period = перший день місяця)
create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.expense_categories (id) on delete cascade,
  period      date not null,                 -- завжди 1-ше число місяця
  amount      numeric(14, 2) not null check (amount >= 0),
  currency    text not null default 'UAH',
  created_at  timestamptz not null default now(),
  unique (user_id, category_id, period)
);

-- Привʼязка витрати до активу, з якого списано кошти (необовʼязкова).
-- alter ... if not exists — щоб застосувалось і на вже створеній БД.
alter table public.expenses
  add column if not exists asset_id uuid references public.assets (id) on delete set null;

-- Опційна підкатегорія витрати (дочірня expense_categories).
alter table public.expenses
  add column if not exists subcategory_id uuid references public.expense_categories (id) on delete set null;

-- ---------- Індекси ----------
create index if not exists idx_expenses_user_date   on public.expenses (user_id, spent_at desc);
create index if not exists idx_expenses_asset       on public.expenses (asset_id);
create index if not exists idx_expenses_category    on public.expenses (category_id);
create index if not exists idx_assets_user          on public.assets (user_id);
create index if not exists idx_snapshots_user_date  on public.net_worth_snapshots (user_id, snapshot_date);
create index if not exists idx_budgets_user_period  on public.budgets (user_id, period);

-- ============================================================
--  Row Level Security — кожен бачить лише свої дані
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.expense_categories  enable row level security;
alter table public.expenses            enable row level security;
alter table public.asset_categories    enable row level security;
alter table public.assets              enable row level security;
alter table public.net_worth_snapshots enable row level security;
alter table public.budgets             enable row level security;

-- Хелпер для створення політик "власник рядка" без дублювання
do $$
declare
  t text;
begin
  foreach t in array array[
    'expense_categories', 'expenses',
    'asset_categories', 'assets', 'net_worth_snapshots', 'budgets'
  ]
  loop
    execute format('drop policy if exists "owner_select" on public.%I;', t);
    execute format('drop policy if exists "owner_insert" on public.%I;', t);
    execute format('drop policy if exists "owner_update" on public.%I;', t);
    execute format('drop policy if exists "owner_delete" on public.%I;', t);

    execute format(
      'create policy "owner_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- Профіль: політики окремо (PK = auth.uid())
drop policy if exists "profile_select" on public.profiles;
drop policy if exists "profile_insert" on public.profiles;
drop policy if exists "profile_update" on public.profiles;
create policy "profile_select" on public.profiles for select using (auth.uid() = id);
create policy "profile_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profile_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================
--  Тригер: при реєстрації — створити профіль і дефолтні категорії
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- профіль
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  -- дефолтні категорії витрат
  insert into public.expense_categories (user_id, name, icon, color) values
    (new.id, 'Продукти',  'ShoppingCart', '#22c55e'),
    (new.id, 'Кафе',      'Coffee',       '#f59e0b'),
    (new.id, 'Транспорт', 'Bus',          '#3b82f6'),
    (new.id, 'Речі',      'Shirt',        '#ec4899'),
    (new.id, 'Школа',     'GraduationCap','#8b5cf6'),
    (new.id, 'Здоровʼя',  'HeartPulse',   '#ef4444'),
    (new.id, 'Розваги',   'Gamepad2',     '#06b6d4'),
    (new.id, 'Інше',      'Tag',          '#64748b');

  -- дефолтні категорії активів
  insert into public.asset_categories (user_id, name, type, icon, color) values
    (new.id, 'Інвестиції',      'investment', 'TrendingUp', '#6366f1'),
    (new.id, 'Подушка безпеки', 'safety',     'ShieldCheck','#10b981'),
    (new.id, 'Готівка та картки','cash',       'Wallet',     '#f59e0b');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  Тригер: оновлювати updated_at на активах
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists assets_touch_updated_at on public.assets;
create trigger assets_touch_updated_at
  before update on public.assets
  for each row execute function public.touch_updated_at();
