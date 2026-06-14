# 💰 Бюджет — особистий фінансовий трекер

Повноцінний особистий фінансовий застосунок: активи, витрати, доходи, бюджети,
цілі, кредити, аналітика, звіти. Преміальний мінімалістичний інтерфейс,
українською, світла/темна тема, PWA (встановлюється на телефон).

> **Цей README — повний контекст проєкту.** Його достатньо, щоб нова сесія
> AI-асистента або розробник зрозуміли архітектуру, модель даних та бізнес-логіку
> й могли безпечно вносити зміни.

---

## 1. Стек і ключові обмеження

| Шар | Технологія |
| --- | --- |
| Фреймворк | **Next.js 16.2** (App Router, Turbopack) |
| Мова | TypeScript, React 19 |
| Стилі | **Tailwind CSS v4** (CSS-конфіг, без `tailwind.config.js`) |
| БД + Auth | **Supabase** (PostgreSQL + Auth, Row Level Security) |
| Графіки | Recharts 3 |
| Іконки | lucide-react **1.x** |
| Дати | date-fns (мінімально; здебільшого власні хелпери) |

### ⚠️ Особливості Next.js 16 (НЕ як у старіших версіях)
- **`cookies()` — асинхронний**: `const store = await cookies()`.
- `params`/`searchParams` у сторінках — Promise, потрібен `await`.
- **Middleware перейменовано на `proxy`**: файл `src/proxy.ts`, функція `export function proxy()`. Конвенція та API ті самі, що в middleware.
- Turbopack за замовчуванням. `next.config.ts` фіксує `turbopack.root` (бо в батьківських теках є інші lockfile-и).
- Перед написанням коду варто звірятися з `node_modules/next/dist/docs/` (так вимагає `AGENTS.md`).

### ⚠️ lucide-react 1.x — частина іконок перейменована
Деякі звичні назви **не існують**. Перевірені заміни, що використовуються в проєкті:
- `PieChart` → **`ChartPie`**
- `BarChart3` → **`ChartColumn`**
- `Filter` → **`ListFilter`**
- `Home` → **`House`**
- `CheckCircle2` → **`CircleCheckBig`**

Компонент `src/components/ui/icon.tsx` рендерить іконку за рядковою назвою і
**падає на `Tag`**, якщо назви немає — тож невідома назва не ламає білд, але іконка буде неправильна. Перевіряй назви: `node -e "console.log('X' in require('lucide-react').icons)"`.

---

## 2. Швидкий старт

```bash
npm install
# Заповни .env.local (див. нижче), потім:
npm run dev          # http://localhost:3000
```

### Змінні середовища (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon|publishable key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # на проді — домен Vercel
```
- Підтримується як класичний **anon**, так і новий **publishable** (`sb_publishable_…`) ключ.
- Якщо змінні не задані, `src/lib/supabase/config.ts` підставляє валідні плейсхолдери — застосунок збереться й запуститься, але запити не працюватимуть. `proxy.ts` обгортає `getUser()` у try/catch, тож відсутність конфігу не валить сервер.

### База даних
Уся схема — в одному файлі **`supabase/schema.sql`** (idempotent). Виконати в
**Supabase → SQL Editor → New query → Run**. Повторний запуск безпечний:
таблиці через `create table if not exists`, нові колонки через
`alter table … add column if not exists`, політики — `drop policy if exists` + `create`.

> **Міграції застосовуються вручну.** У застосунку немає авто-міграцій. Додаючи
> колонку/таблицю, додай її і в `schema.sql`, і дай користувачу окремий SQL для запуску.

### Деплой
**Vercel** (push у GitHub → автодеплой). У Vercel задати ті самі env-змінні
(+ `NEXT_PUBLIC_SITE_URL` = продакшн-домен). У Supabase → Authentication →
URL Configuration додати домен у **Redirect URLs** (`https://…vercel.app/**`).
Якщо ввімкнено **Vercel Deployment Protection** — вимкнути, інакше сайт закритий.

---

## 3. Структура проєкту

```
src/
├─ proxy.ts                      # Next 16 «middleware»: оновлення сесії + захист маршрутів
├─ app/
│  ├─ layout.tsx                 # root: шрифт Geist (cyrillic), тема (no-flash script), SW-реєстрація, метадані/PWA
│  ├─ globals.css                # Tailwind v4 + дизайн-токени (CSS-змінні), темна тема, @media print
│  ├─ manifest.ts                # PWA-маніфест (Next генерує /manifest.webmanifest)
│  ├─ icon.png / apple-icon.png  # PWA/favicon іконки (згенеровані scripts/generate-icons.js)
│  ├─ page.tsx                   # / → redirect /dashboard
│  ├─ (auth)/                    # ПУБЛІЧНІ: layout (брендований) + /login + /signup
│  ├─ auth/
│  │  ├─ callback/route.ts       # OAuth/magic-link: exchangeCodeForSession
│  │  └─ signout/route.ts        # POST → signOut → /login
│  └─ (app)/                     # ЗАХИЩЕНІ сторінки (під layout з AppShell)
│     ├─ layout.tsx              # auth-guard, processRecurring(), fetch profile/categories/assets/rates → AppShell
│     ├─ dashboard, expenses, income, recurring, budget,
│     │  goals, assets, credits, analytics, reports, help, settings
├─ components/
│  ├─ app/app-shell.tsx          # КЛІЄНТСЬКИЙ контекст застосунку (див. §6) + глобальний модал витрати + command palette
│  ├─ app/command-palette.tsx    # Ctrl/⌘+K
│  ├─ layout/                    # sidebar (+ mobile nav), topbar, user-menu, nav-items
│  ├─ auth/ theme/ pwa/          # форма входу, тема, встановлення PWA + реєстрація SW
│  ├─ <feature>/                 # expenses, income, recurring, budget, goals, assets, credits, analytics, reports, dashboard
│  ├─ charts/charts.tsx          # NetWorthChart(area), DailyBarChart, MultiLineChart, CategoryDonut
│  └─ ui/                        # Button, Card, Input/Select/Textarea/Label, Modal, StatCard, EmptyState, Icon, TagInput
└─ lib/
   ├─ supabase/                  # client (browser), server (RSC/actions), middleware (proxy-сесія), config
   ├─ actions/                   # СЕРВЕРНІ ЕКШЕНИ ("use server"): expenses, incomes, recurring, budgets, goals, assets, credits, profile
   ├─ server/                    # НЕ-"use server" серверні модулі: net-worth, rates, recurring (можуть приймати несеріалізовані аргументи)
   ├─ queries.ts                 # серверні читання/агрегації (приймають base+rates для конвертації)
   ├─ currency.ts                # convert(from→base), convertBetween(from→to) — клієнт+сервер
   ├─ dashboard-widgets.ts       # реєстр віджетів дашборду + isWidgetOn()
   ├─ constants.ts               # CURRENCIES, кольори/іконки категорій, типи активів
   ├─ types.ts                   # усі доменні типи (Profile, Expense, Income, Asset, …)
   └─ utils.ts                   # cn, formatCurrency/formatNumber, дати (monthBounds, toISODate, nextPaymentDate…)

supabase/schema.sql              # вся схема БД + RLS + тригери
scripts/generate-icons.js        # генератор PWA-іконок (без залежностей)
```

---

## 4. Модель даних (Supabase / Postgres)

Усі таблиці належать користувачу через `user_id` і захищені **RLS**
(політики `owner_select/insert/update/delete`: `auth.uid() = user_id`).
`profiles` — політики по `id`. **Кожен бачить лише свої дані.**

| Таблиця | Призначення | Ключові поля |
| --- | --- | --- |
| `profiles` | 1:1 з `auth.users` | `display_name`, `base_currency` (UAH/USD/EUR), `dashboard_prefs jsonb` |
| `expense_categories` | категорії витрат + **підкатегорії** | `parent_id` (self-ref; NULL = верхня), `name`, `icon`, `color` |
| `expenses` | витрати | `category_id`, `subcategory_id`, `asset_id` (списання), `amount`, `currency`, `spent_at`, `comment`, `tags text[]` |
| `incomes` | доходи | `source`, `amount`, `currency`, `received_at`, `comment`, `asset_id` (зарахування) |
| `recurring_expenses` | шаблони підписок | `category_id`, `asset_id`, `name`, `amount`, `day_of_month`, `active`, `next_run`, `last_run` |
| `asset_categories` | категорії активів | `type` (investment/safety/cash/custom), `name`, `icon`, `color` |
| `assets` | активи (рахунки) | `category_id`, `name`, `value`, `currency`; тригер `touch_updated_at` |
| `net_worth_snapshots` | історія Net Worth | `snapshot_date` (unique з user_id), `total_value` |
| `budgets` | місячні ліміти за категоріями | `category_id`, `period` (1-ше число місяця), `amount`, unique(user,cat,period) |
| `goals` | фінансові цілі | `target_amount`, `current_amount` (ручні), `asset_id` (привʼязка), `target_date`, `icon`, `color` |
| `credits` | кредити/борги | `lender`, `name`, `total_amount`, `remaining_amount`, `monthly_payment`, `payment_day` (опц.) |

### Тригери
- `handle_new_user` (after insert на `auth.users`) → створює `profiles` + дефолтні
  категорії витрат (8 шт.) і активів (3 шт.).
- `touch_updated_at` на `assets`.

### Реєстрація потребує таблиць
Якщо `handle_new_user` падає (немає таблиць) — реєстрація ламається. Тому **спершу
запусти `schema.sql`**, потім реєструйся.

---

## 5. Авторизація

- Email+пароль і **Google OAuth** через Supabase Auth (`@supabase/ssr`).
- Браузерний клієнт: `lib/supabase/client.ts`; серверний: `lib/supabase/server.ts`
  (читає `await cookies()`).
- **`src/proxy.ts`** на кожному запиті оновлює сесію (`updateSession` у
  `lib/supabase/middleware.ts`), редіректить неавторизованих на `/login`, а
  авторизованих зі сторінок входу — на `/dashboard`.
- **`matcher` у proxy виключає** статику, зображення, **`manifest.webmanifest` і `sw.js`** —
  інакше PWA-файли редіректились би на /login (це вже фіксилось).
- OAuth-флоу: кнопка → `signInWithOAuth` → Supabase → `/auth/callback` (route handler:
  `exchangeCodeForSession`) → `/dashboard`.
- Для локального тесту зручно вимкнути підтвердження email у Supabase
  (Authentication → Email → Confirm email = off) або створити користувача з
  «Auto Confirm User».

---

## 6. AppShell і клієнтський контекст

`(app)/layout.tsx` (серверний) робить: auth-guard → `processRecurring(userId)` →
паралельно тягне `profile`, `expense_categories`, `assets`, рахує `base` і
`getRates(base)` → передає в **`AppShell`** (клієнтський).

`AppShell` надає React-контекст `useApp()`:
```ts
{ openExpense(expense?), openPalette(), categories, assets, currency /* = base */, rates }
```
- Будь-який клієнтський в'ю бере `currency` (базову валюту) та `rates` з `useApp()`
  для **конвертації сум** і форматування.
- Глобальний модал «нова/редагувати витрата» і command palette живуть тут.
- Гарячі клавіші: `Ctrl/⌘+K` (палітра), `Ctrl/⌘+E` (нова витрата).

---

## 7. Мультивалютність (важливий інваріант)

- **Кожен запис** зберігає власну `currency`. Окремі рядки (у списках) показуються
  **у власній валюті**.
- **Усі агреговані суми** (Net Worth, підсумки місяця, аналітика, бюджет, борги,
  звіти) конвертуються в **базову валюту** користувача (`profile.base_currency`).
- Курси: `lib/server/rates.ts` → `getRates(base)` тягне з `open.er-api.com`
  з **кешем Next `fetch` на 6 год** (`revalidate: 21600`); фолбек — статичні курси.
  Формат: `rates[C]` = одиниць валюти `C` за 1 одиницю base.
- Хелпери `lib/currency.ts`:
  - `convert(amount, from, base, rates)` = `amount / rates[from]` (from → base).
  - `convertBetween(amount, from, to, base, rates)` (from → base → to) — для переказів.
- **Патерн застосування:** серверні агрегації (`queries.ts`) приймають `(base, rates)`
  і конвертують у `reduce`. Клієнтські в'юхи беруть `base`+`rates` з `useApp()`.
  В `analytics-view` витрати конвертуються **один раз на вході** (`map`), далі вся
  логіка рахує вже в базовій.
- Продуктивність: одне ділення на запис; курси кешуються → впливу немає.

---

## 8. Бізнес-логіка за фічами

### Net Worth (чистий капітал)
- `getAssetsData` рахує `total` = Σ активів (конвертованих у base).
- **Дашборд:** `netWorth = активи − залишок кредитів`.
- **Снапшоти:** `lib/server/net-worth.ts` → `recomputeNetWorth(userId)` перераховує
  суму активів і робить `upsert` у `net_worth_snapshots` на сьогодні. Викликається
  після **будь-якої** зміни, що впливає на баланси активів.
- `applyAssetDeltas({ [assetId]: delta })` — застосовує дельти до балансів.

### Витрати
- Поля: категорія + опц. підкатегорія, сума+валюта, дата, коментар, **теги** (`text[]`),
  опц. **списання з активу**.
- Списання з активу: при create — `asset.value -= amount`; update — відкат старого
  впливу + новий; delete — повернення. Після — `recomputeNetWorth`. (Логіка в
  `lib/actions/expenses.ts`, дельти збираються в акумулятор.)
- Підкатегорія: `category_id` = верхня, `subcategory_id` = дочірня. Аналітика рахує
  за верхньою. У списку підкатегорія підтягується з `useApp().categories` за id.
- Теги: фільтрація на сторінці «Витрати» **на клієнті** (без запитів); підсумок
  зверху = сума за обраним тегом.

### Доходи
- Дзеркало витрат: опц. **зарахування на актив** (`asset.value += amount`) + recompute.
- Дашборд: `Баланс місяця = доходи − витрати`, норма заощаджень.

### Повторювані витрати (підписки)
- Шаблон: назва, сума, `day_of_month`, категорія, опц. актив, `active`.
- **Ліниве нарахування:** `lib/server/recurring.ts` → `processRecurring(userId)`
  викликається у `(app)/layout.tsx` на кожному заході. Генерує реальні витрати за
  всі настали дати (догенеровує пропущені місяці), просуває `next_run`, застосовує
  списання з активу. Без зовнішнього cron. **Не викликає `revalidatePath`** (бо
  працює під час рендера) — свіжі дані видно одразу, бо layout рендериться до сторінки.

### Бюджет
- Місячні ліміти за категоріями (`period` = 1-ше число). `budget-view` тягне
  budgets+expenses місяця на клієнті, конвертує в base, рахує прогрес.
- Кольори прогресу: зелений → жовтий (≥80%) → червоний (перевищення).
- «Копіювати з минулого місяця» — `copyBudgetFromPrevMonth`.

### Цілі
- **Привʼязані до активу** (прогрес = баланс активу) АБО **ручні** (`current_amount`
  + швидкі внески +100/+500/+1000 через `addGoalContribution`).
- Дедлайн → підказка «скільки відкладати щомісяця».

### Активи
- CRUD + **`±` коригування** (`adjustAsset(id, delta)`, clamp ≥0) — додати/зняти без
  нового запису.
- **Переказ** (`transferBetweenAssets`): знімає з джерела, додає на призначення;
  різні валюти → сума конвертується (`convertBetween`), редагується під реальний курс.
  Переказ **НЕ** є витратою/доходом — лише рух між активами.
- Кнопки дій **завжди видимі** (раніше були hover-only → невидимі на тач/PWA).

### Кредити
- Залишок зменшується платежами (`addCreditPayment`). `payment_day` (опц.) → найближча
  дата на картці + дашборд-віджет «Найближчі платежі» (`nextPaymentDate`/`daysUntil`).
- Загальний борг віднімається від Net Worth.

### Аналітика
- Перемикач тиждень/місяць/рік + навігація по місяцях (`monthOffset`).
- Графіки: по днях/місяцях (bar), donut, топ категорій.
- **Порівняння за місяцями:** вибір категорії (або «Усі») + довільний набір з 12
  місяців; мультилінійний тренд / стовпці + статистика (сума, середнє, макс, зміна).

### Звіти + PDF
- `/reports`: період (місяць/минулий/рік/власний діапазон) → зведення, розподіл за
  категоріями/джерелами, деталізація витрат.
- **PDF = друк браузера** (`window.print()` + `@media print` у globals.css, що форсує
  світлу палітру; sidebar/topbar/nav мають `print:!hidden`). **Без бібліотек.**

### Дашборд (кастомізація)
- `dashboard-widgets.ts` — реєстр віджетів (метрики + блоки). `isWidgetOn(prefs, key)`
  = `prefs?.[key] !== false` (за замовчуванням усе ввімкнено).
- `DashboardCustomizer` зберігає `profiles.dashboard_prefs` (jsonb) → **синхрон між
  пристроями**. Дашборд гейтить кожну картку/блок через `show(key)`.

### PWA
- `manifest.ts` + іконки + мінімальний `public/sw.js` (network-first), реєстрація
  **лише в проді** (`components/pwa/sw-register.tsx`). Кнопка встановлення — у Налаштуваннях.

---

## 9. Як додати нову фічу (патерни проєкту)

1. **Схема:** додай таблицю/колонку в `supabase/schema.sql` (idempotent) + додай
   таблицю в RLS-цикл і `enable row level security`. Дай користувачу окремий SQL.
2. **Тип:** у `lib/types.ts`.
3. **Серверний екшен:** `lib/actions/<feature>.ts` з `"use server"`. Усі **export**
   у такому файлі мають бути async-екшенами із серіалізованими аргументами. Спільні
   хелпери (що приймають supabase-клієнт тощо) клади у `lib/server/*` (без `"use server"`).
   Після мутацій — `revalidatePath(...)`.
4. **Запити/агрегації:** у `queries.ts`; якщо рахуєш суми — приймай `(base, rates)`
   і конвертуй через `convert`.
5. **Сторінка:** `app/(app)/<feature>/page.tsx` (серверна, з `getUserId()` guard) →
   рендерить клієнтський в'ю.
6. **Навігація:** додай пункт у `components/layout/nav-items.ts` (mobile nav скролиться).
7. **Іконки:** перевір назву в lucide 1.x (див. §1).
8. **Перевірка:** `npx tsc --noEmit && npm run build` перед комітом.

### 🐞 Відомі граблі (вже виправлені — не повторюй)
- **PGRST201 «more than one relationship»:** у `expenses` ДВА FK на
  `expense_categories` (`category_id`, `subcategory_id`). Embed має бути однозначним:
  `category:expense_categories!expenses_category_id_fkey(*)`.
- **Hand-rolled `Database` generic** для supabase-js спричиняв `never`-типи → клієнти
  створюються **без** generic; типобезпека — через ручні інтерфейси + касти
  (`as unknown as T[]`) у `queries.ts`.
- **proxy `matcher`** має виключати `manifest.webmanifest` і `sw.js`.
- **`new Date()`** у коді застосунку — ОК (обмеження стосувалось лише Workflow-скриптів).

---

## 10. Команди

| Команда | Дія |
| --- | --- |
| `npm run dev` | Дев-сервер (Turbopack) |
| `npm run build` | Продакшн-збірка (також ганяє tsc) |
| `npx tsc --noEmit` | Лише перевірка типів |
| `npm run lint` | ESLint |
| `node scripts/generate-icons.js` | Перегенерувати PWA-іконки |

---

## 11. Безпека
- **RLS** — головний захист: навіть із публічним anon/publishable ключем чужі дані
  недоступні (фільтрує Postgres).
- Anon/publishable ключ публічний за дизайном (кладеться у `NEXT_PUBLIC_*`).
- `.env.local` у `.gitignore`; у репо лише `.env.example`.

---

*Технічний борг / можливі покращення: при десятках тисяч записів сторінки
«Витрати»/«Аналітика» вантажать усі записи на клієнт — тоді варто перейти на
серверну агрегацію/пагінацію. Снапшоти Net Worth зберігаються «як є» (історичні
значення не переконвертовуються при зміні базової валюти).*
