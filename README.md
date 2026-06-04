# 💰 Бюджет — особистий фінансовий трекер

Сучасний веб-додаток для управління особистими фінансами: активи (Net Worth),
витрати, аналітика та планування. Преміальний мінімалістичний інтерфейс,
українською, зі світлою/темною темою.

**Стек:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(Postgres + Auth) · Recharts.

---

## ✨ Можливості (MVP)

- **Авторизація** — email/пароль + вхід через Google (Supabase Auth), захищені маршрути.
- **Дашборд** — Net Worth, витрати місяця, найбільша категорія, автоматичні інсайти.
- **Витрати** — швидке додавання, редагування, видалення; фільтри за періодом,
  категорією та пошуком; групування за днями.
- **Категорії** — власні категорії з іконкою та кольором (інлайн-створення).
- **Активи** — групування за категоріями (інвестиції, подушка безпеки, готівка…),
  загальний капітал і графік динаміки.
- **Аналітика** — графік витрат по днях/місяцях, donut за категоріями, топ категорій,
  порівняння період-до-періоду.
- **Command Palette** — `Cmd/Ctrl + K` для пошуку та дій; `Cmd/Ctrl + E` — нова витрата.
- **Тема** — світла / темна з плавним переходом, без миготіння.
- **Експорт** — витрати у CSV.
- **Адаптивність** — десктоп і мобільний (нижня навігація).

> Далі за дорожньою картою: бюджет-планування, фінансові цілі, повторювані витрати,
> повна мультивалютна конвертація.

---

## 🚀 Швидкий старт

### 1. Створи проєкт у Supabase

1. Зареєструйся на [supabase.com](https://supabase.com) → **New project**.
2. Дочекайся ініціалізації бази.

### 2. Застосуй схему БД

1. У Supabase відкрий **SQL Editor → New query**.
2. Встав вміст файлу [`supabase/schema.sql`](supabase/schema.sql) і натисни **Run**.
   Скрипт створить таблиці, RLS-політики, тригери та дефолтні категорії для
   кожного нового користувача.

### 3. Налаштуй змінні середовища

У Supabase: **Project Settings → API**. Скопіюй значення у файл `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Запусти застосунок

```bash
npm install
npm run dev
```

Відкрий [http://localhost:3000](http://localhost:3000).

---

## 🔐 Налаштування авторизації

### Email/пароль
Працює одразу. Для локальної розробки зручно вимкнути підтвердження email:
**Authentication → Providers → Email → "Confirm email"** = off
(тоді після реєстрації одразу буде активна сесія).

### Google OAuth
1. У [Google Cloud Console](https://console.cloud.google.com/) створи OAuth-клієнт
   (тип «Web application»).
2. **Authorized redirect URI:**
   `https://<your-project>.supabase.co/auth/v1/callback`
3. У Supabase: **Authentication → Providers → Google** — увімкни та встав
   Client ID і Client Secret.
4. У **Authentication → URL Configuration** додай
   `http://localhost:3000/**` до **Redirect URLs**.

---

## 🗂️ Структура проєкту

```
src/
├─ app/
│  ├─ (auth)/            # /login, /signup (публічні)
│  ├─ (app)/             # захищені сторінки: dashboard, expenses, assets, analytics, settings
│  ├─ auth/              # callback (OAuth) та signout (route handlers)
│  └─ layout.tsx         # шрифти, тема
├─ components/
│  ├─ app/               # AppShell (контекст), command palette
│  ├─ auth/  layout/  theme/
│  ├─ expenses/ assets/ analytics/ settings/
│  ├─ charts/            # Recharts-обгортки
│  └─ ui/                # Button, Card, Input, Modal, StatCard…
├─ lib/
│  ├─ supabase/          # client / server / proxy-session
│  ├─ actions/           # серверні екшени (мутації)
│  ├─ queries.ts         # серверні запити
│  ├─ types.ts  utils.ts  constants.ts
└─ proxy.ts              # оновлення сесії + захист маршрутів (колишній middleware)

supabase/schema.sql      # схема БД + RLS + тригери
```

## 🔒 Безпека даних

- **Row Level Security** на всіх таблицях — кожен користувач бачить лише свої записи.
- Сесія оновлюється на кожному запиті у `proxy.ts`, неавторизовані редіректяться на `/login`.
- Anon-ключ є публічним за дизайном; доступ обмежується саме RLS-політиками.

---

## 📜 Скрипти

| Команда | Дія |
| --- | --- |
| `npm run dev` | Запуск дев-сервера (Turbopack) |
| `npm run build` | Продакшн-збірка |
| `npm run start` | Запуск продакшн-збірки |
| `npm run lint` | ESLint |
