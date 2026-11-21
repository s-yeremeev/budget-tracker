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
│     ├─ loading.tsx             # скелет вмісту під час переходу між сторінками (меню/шапка лишаються)
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
   ├─ server/                    # НЕ-"use server" серверні модулі: session (кешовані user/profile), daily-processing, recurring, credit-payments, net-worth, rates (можуть приймати несеріалізовані аргументи)
   ├─ queries.ts                 # серверні читання/агрегації (приймають base+rates для конвертації)
   ├─ fetch-all.ts               # fetchAll: усі рядки частинами (обхід ліміту 1000 рядків на запит)
   ├─ money.ts                   # гроші: rescheduleNextRun, toAssetAmount, netWorthTotal, cardDebtTotal
   ├─ periods.ts                 # «той самий період» минулого місяця/року, прогноз до кінця місяця
   ├─ safe-redirect.ts           # safeRedirectPath: лише внутрішні шляхи після входу (без open redirect)
   ├─ category-filter.ts         # фільтр витрат за категорією/підкатегорією (витрати + аналітика)
   ├─ analytics.ts               # чисті функції аналітики: monthsBack, buildComparison
   ├─ budget.ts                  # план/факт бюджету: computeBudget, plannedTotal (сторінка «Бюджет» + дашборд)
   ├─ *.test.ts                  # unit-тести чистої логіки (Vitest, `npm test`)
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
| `profiles` | 1:1 з `auth.users` | `display_name`, `base_currency` (UAH/USD/EUR), `dashboard_prefs jsonb`, `auto_processed_on date` (день останнього авто-нарахування) |
| `expense_categories` | категорії витрат + **підкатегорії** | `parent_id` (self-ref; NULL = верхня), `name`, `icon`, `color` |
| `expenses` | витрати | `category_id`, `subcategory_id`, `asset_id` (списання), `amount`, `currency`, `spent_at`, `comment`, `tags text[]` |
| `incomes` | доходи | `source`, `amount`, `currency`, `received_at`, `comment`, `asset_id` (зарахування) |
| `recurring_expenses` | шаблони підписок | `category_id`, `asset_id`, `name`, `amount`, `day_of_month`, `active`, `next_run`, `last_run` |
| `asset_categories` | категорії активів | `type` (investment/safety/cash/custom), `name`, `icon`, `color` |
| `assets` | активи (рахунки) | `category_id`, `name`, `value`, **`credit_limit`** (овердрафт), `currency`; тригер `touch_updated_at` |
| `net_worth_snapshots` | історія Net Worth | `snapshot_date` (unique з user_id), `total_value` |
| `budgets` | місячні ліміти за категоріями | `category_id`, `period` (1-ше число місяця), `amount`, unique(user,cat,period) |
| `goals` | фінансові цілі | `target_amount`, `current_amount` (ручні), `asset_id` (привʼязка), `target_date`, `icon`, `color` |
| `credits` | кредити/борги | `lender`, `name`, `total_amount`, `remaining_amount`, `monthly_payment`, `payment_day`, **`auto_pay`**, **`payment_asset_id`**, **`payment_category_id`**, **`next_payment`** |

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
  `exchangeCodeForSession`) → `/dashboard` або `?next=` — лише внутрішній шлях
  (`safeRedirectPath`; зовнішні `https://…`, `//…`, `/…` відкидаються). Те саме у формі входу.
- Для локального тесту зручно вимкнути підтвердження email у Supabase
  (Authentication → Email → Confirm email = off) або створити користувача з
  «Auto Confirm User».

---

## 6. AppShell і клієнтський контекст

`(app)/layout.tsx` (серверний) робить: auth-guard (`getCurrentUserId`) → паралельно
тягне `profile`, `expense_categories`, `assets` → **раз на день** авто-нарахування
(`runDailyProcessing`, див. §8; якщо щось згенеровано — перечитує активи) →
`getRates(base)` → передає в **`AppShell`** (клієнтський).

**Дані запиту — один раз на рендер** (`lib/server/session.ts`, React `cache`). Layout і
сторінка рендеряться **паралельно**, тож спільні дані беруться через кешовані функції:
- `getCurrentUserId()` — `auth.getClaims()`: з асиметричним JWT-ключем перевіряє токен
  локально (JWKS кешується на 10 хв), з симетричним — сам звертається до Auth; фолбек на
  `getUser()`. Повну перевірку сесії й оновлення токена робить **proxy** на кожному запиті.
- `getProfile(userId)` — профіль (layout, дашборд, активи, налаштування — один запит).
- `getRates(base)` — курси (ще й Next fetch-кеш на 6 год).
У сторінках бери id через `getUserId()` (`queries.ts`) або `getCurrentUserId()`, профіль —
через `getProfile()`, а **не** окремими запитами.

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
- **Списання з рахунку в іншій валюті:** якщо валюта витрати/доходу/підписки/кредиту
  відрізняється від валюти активу, на актив іде сума, переведена за курсом на момент
  збереження (`assetAmountsFor` у `lib/server/asset-amounts.ts`, `toAssetAmount` у
  `lib/money.ts`). Вона зберігається в `expenses.asset_amount` / `incomes.asset_amount`
  (у валюті активу) — при зміні/видаленні запису повертається **рівно вона**
  (`appliedAssetAmount`; у старих записах NULL → сума як є, бо так їх і списали).
  Форми показують підказку «Спишеться ≈ …» (`AssetConversionHint`).

---

## 8. Бізнес-логіка за фічами

### Net Worth (чистий капітал)
- `getAssetsData` рахує `total` = Σ активів (конвертованих у base).
- **Дашборд і «Активи»:** `чистий капітал = активи − залишок кредитів` (обидва в base).
- **Снапшоти:** `lib/server/net-worth.ts` → `recomputeNetWorth(userId)` рахує
  `netWorthTotal` (активи, кожен конвертований у base, − борги) і робить `upsert` у
  `net_worth_snapshots` на сьогодні з `currency = base`, `converted = true`.
  Викликається після змін активів, витрат/доходів з активом, **кредитів** і раз на день.
- Графік (`getNetWorthSeries(userId, base)`) показує лише `converted = true` у поточній
  базовій валюті. Старі снапшоти (до виправлення складали суми різних валют як є й не
  віднімали борги) лишаються в БД, але не показуються — історія починається з виправлення.
  Береться **останні** 180 знімків (desc + reverse), а не перші — інакше через пів року
  графік «застигав» на найстаріших даних.
- `applyAssetDeltas({ [assetId]: delta })` — дельти **у валюті активу**.

### Витрати
- Поля: категорія + опц. підкатегорія, сума+валюта, дата, коментар, **теги** (`text[]`),
  опц. **списання з активу**.
- Списання з активу: при create — `asset.value -= asset_amount` (сума у валюті активу,
  див. §7); update — повернення збереженої `asset_amount` + нове списання; delete —
  повернення. Після — `recomputeNetWorth`. (Логіка в `lib/actions/expenses.ts`.)
- Підкатегорія: `category_id` = верхня, `subcategory_id` = дочірня. Аналітика рахує
  за верхньою. У списку підкатегорія підтягується з `useApp().categories` за id.
- Фільтри сторінки «Витрати» працюють **на клієнті** (без запитів): період, категорія,
  **підкатегорія** (select зʼявляється, коли в обраної категорії є підкатегорії;
  `"all"` / `"none"` = «Без підкатегорії» / id), тег, пошук (коментар, категорія,
  підкатегорія). Логіка — `matchesCategoryFilter` у `lib/category-filter.ts`.
  Підсумок зверху = сума відфільтрованих витрат.

### Доходи
- Дзеркало витрат: опц. **зарахування на актив** (`asset.value += asset_amount`) + recompute.
- Дашборд: `Баланс місяця = доходи − витрати`, норма заощаджень.

### Повторювані витрати (підписки)
- Шаблон: назва, сума, `day_of_month`, категорія, опц. актив, `active`.
- **Ліниве нарахування:** `lib/server/recurring.ts` → `processRecurring(userId)`.
  Генерує реальні витрати за всі настали дати (догенеровує пропущені місяці), просуває
  `next_run`, застосовує списання з активу. Без зовнішнього cron. **Не викликає
  `revalidatePath`** (працює під час рендера).
- **Раз на день** (`lib/server/daily-processing.ts` → `runDailyProcessing`, разом з
  авто-платежами кредитів): позначка `profiles.auto_processed_on` (UTC-дата).
  - Перший запит дня атомарно «забирає» день (`UPDATE … WHERE auto_processed_on IS NULL`
    або `< today` — лише один з паралельних запитів отримає рядок) і запускає нарахування;
    решта запитів дня перевірок не роблять.
  - Створення/зміна/увімкнення шаблону (і кредиту з `auto_pay`) скидає позначку
    (`resetDailyProcessing`) — нарахування на сьогодні з'явиться одразу.
- **Редагування й повторне ввімкнення** (`rescheduleNextRun` у `lib/money.ts`): курсор
  `next_run` не скидається на сьогодні — береться новий день у місяці поточного курсора;
  якщо ця дата вже минула — найближча від сьогодні. Тож редагування в день платежу не
  списує вдруге, а ввімкнення після паузи **не** нараховує пропущені місяці. Те саме для
  `next_payment` кредитів.
  - Помилка нарахування знімає позначку (повтор наступним запитом); помилка самої
    позначки або відсутність колонки (міграцію не застосовано) → обробка на кожному
    запиті, як раніше.
  - Layout і сторінка рендеряться паралельно: у перший запит дня сторінка може ще не
    показати щойно згенеровані витрати — вони з'являться з наступним переходом.

### Бюджет
- Місячні ліміти за категоріями **і підкатегоріями** (`period` = 1-ше число).
  `budget-view` тягне budgets+expenses місяця на клієнті й рахує через
  `computeBudget` (`lib/budget.ts`), конвертуючи в base.
- Витрачено: категорія = усі її витрати (разом із підкатегоріями); підкатегорія =
  витрати з її `subcategory_id`.
- Загальний план (`plannedTotal`): ліміт категорії **включає** її підкатегорії, тож
  ліміти підкатегорій додаються лише коли в батьківської категорії ліміту немає.
- **Підсумок «Витрачено в межах плану / Залишок»** рахує лише витрати, що мають ліміт
  (`isInBudgetScope`: ліміт категорії або, якщо його немає, ліміт підкатегорії). Решта
  (зокрема без категорії) — окремим рядком «Поза бюджетом». Без жодного ліміту —
  «Витрачено» = усі витрати, залишок «—». Те саме на дашборді («Залишок бюджету»,
  `getMonthBudgetItems` + `summarizeMonthBudget`).
- Підкатегорії показуються з відступом під своєю категорією (з підписом батьківської).
- Кольори прогресу: зелений → жовтий (≥80%) → червоний (перевищення).
- «Копіювати з минулого місяця» — `copyBudgetFromPrevMonth`.

### Цілі
- **Привʼязані до активу** (прогрес = баланс активу) АБО **ручні** (`current_amount`
  + швидкі внески +100/+500/+1000 через `addGoalContribution`).
- Дедлайн → підказка «скільки відкладати щомісяця».

### Активи
- CRUD + **`±` коригування** (`adjustAsset(id, delta)`) — додати/зняти без нового запису.
  Зняти більше, ніж є (з урахуванням `credit_limit`), не можна — повертається помилка,
  а не тихе обрізання до нуля.
- **Переказ** (`transferBetweenAssets`): знімає з джерела, додає на призначення;
  різні валюти → сума конвертується (`convertBetween`), редагується під реальний курс.
  Переказ **НЕ** є витратою/доходом — лише рух між активами.
- Кнопки дій **завжди видимі** (раніше були hover-only → невидимі на тач/PWA).
- **Кредитний ліміт (`credit_limit`, овердрафт):** баланс може йти у мінус до
  `−credit_limit`; «доступно» = `value + credit_limit`. `adjustAsset` і
  `transferBetweenAssets` **відхиляють** операцію нижче `−credit_limit`. Витрати
  (`applyAssetDeltas`) **не** обмежуються. Відʼємний `value` природно зменшує Net Worth.
- Шапка «Активи»: чистий капітал = активи − борги (підказка «Активи X − борги Y»).

### Кредити
- Залишок зменшується платежами (`addCreditPayment`). `payment_day` (опц.) → найближча
  дата на картці + дашборд-віджет «Найближчі платежі» (`nextPaymentDate`/`daysUntil`).
- **Авто-списання (`auto_pay`):** `lib/server/credit-payments.ts` →
  `processCreditPayments(userId)` — раз на день разом із підписками (див. «Повторювані
  витрати»). У день платежу генерує
  витрату-платіж (`payment_category_id`), списує з `payment_asset_id`, зменшує
  `remaining_amount`, просуває `next_payment` (догенеровує пропущені місяці).
- Загальний борг віднімається від Net Worth.
- Сторінка й дашборд-віджет показують **окремо** «Борг за кредитами» і «Мінус на картках»
  (сума відʼємних балансів активів, `cardDebtTotal`).

### Аналітика
- Перемикач тиждень/місяць/рік + навігація по місяцях (`monthOffset`).
- **Чесне порівняння:** поточний (неповний) місяць/рік порівнюється з **тими самими днями**
  минулого місяця/року (`samePeriodPrevMonth`/`samePeriodPrevYear` у `lib/periods.ts`),
  підпис «Порівняння: 1–21 жовтня». Завершені періоди — з повним попереднім.
- Графіки: по днях/місяцях (bar), donut, топ категорій.
- **Порівняння за місяцями:** вибір категорії (або «Усі») + опц. **підкатегорії**
  (або «Без підкатегорії») + довільний набір з 12 місяців; мультилінійний тренд /
  стовпці + статистика (сума, середнє, макс, зміна). Логіка — `buildComparison`
  у `lib/analytics.ts`.

### Звіти + PDF
- `/reports`: період (місяць/минулий/рік/власний діапазон) → зведення, розподіл за
  категоріями/джерелами, деталізація витрат. Дані — `fetchAll` (за рік легко понад 1000).
- **PDF = друк браузера** (`window.print()` + `@media print` у globals.css, що форсує
  світлу палітру; sidebar/topbar/nav мають `print:!hidden`). **Без бібліотек.**

### Дашборд (кастомізація)
- `dashboard-widgets.ts` — реєстр віджетів (метрики + блоки). `isWidgetOn(prefs, key)`
  = `prefs?.[key] !== false` (за замовчуванням усе ввімкнено).
- `DashboardCustomizer` зберігає `profiles.dashboard_prefs` (jsonb) → **синхрон між
  пристроями**. Дашборд гейтить кожну картку/блок через `show(key)`.
- «Витрати місяця» порівнюються з тими самими днями минулого місяця (`previousSamePeriod`
  з `getMonthComparison`); інсайти — з прогнозом до кінця місяця (`monthEndForecast`).
- Прогрес цілей з привʼязаним активом — у валюті цілі (`convertBetween`).

### Налаштування
- Профіль (імʼя, базова валюта), тема, встановлення PWA.
- **Категорії** (`components/settings/category-manager.tsx`): перейменування, видалення
  (витрати лишаються без категорії/підкатегорії, ліміти бюджету видаляються), нові
  категорії й підкатегорії.
- **Експорт CSV** — уся історія витрат (`fetchAll`).

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
8. **Перевірка:** `npm test && npx tsc --noEmit && npm run build` перед комітом.
   Розрахункову логіку винось у чисті функції `lib/*.ts` і покривай `lib/*.test.ts`
   (Vitest, `globals: true` — у тестах не імпортуй `vitest`, лише
   `/// <reference types="vitest/globals" />`: на Windows імпорт ламається, якщо
   термінал відкрито як `c:\…`, а не `C:\…`).

### 🐞 Відомі граблі (вже виправлені — не повторюй)
- **PGRST201 «more than one relationship»:** у `expenses` ДВА FK на
  `expense_categories` (`category_id`, `subcategory_id`). Embed має бути однозначним:
  `category:expense_categories!expenses_category_id_fkey(*)`.
- **Hand-rolled `Database` generic** для supabase-js спричиняв `never`-типи → клієнти
  створюються **без** generic; типобезпека — через ручні інтерфейси + касти
  (`as unknown as T[]`) у `queries.ts`.
- **proxy `matcher`** має виключати `manifest.webmanifest` і `sw.js`.
- **Мемоізація `fetch` у рендері:** Next запамʼятовує однакові GET-запити в межах рендера
  (supabase-js ходить через `fetch`). Код, що **пише і перечитує** (баланси активів,
  Net Worth, авто-нарахування), отримував застарілі дані: друге списання з того самого
  активу перетирало перше. Для такого коду — `createClient({ fresh: true })` (власний
  `AbortSignal` вимикає мемоізацію). У звичайних читаннях мемоізація корисна — лишай.
- **`or(...)` у PATCH** (PostgREST 12) по `auto_processed_on` падав з 42703 «column does not
  exist» — для атомарних умовних оновлень використовуй прості фільтри (`is`, `lt`, `eq`).
- **`new Date()`** у коді застосунку — ОК (обмеження стосувалось лише Workflow-скриптів).
- **Ліміт 1000 рядків на запит:** Supabase (PostgREST `max_rows`) **мовчки** обрізає
  відповідь — найстаріші записи просто зникали б зі списків, аналітики, звітів і CSV.
  Будь-який запит без `.limit()`, що може перевищити 1000 рядків (історія витрат/доходів,
  діапазони дат), роби через `fetchAll` (`lib/fetch-all.ts`): `select(…, { count: "exact" })`,
  **стабільний порядок** з унікальним полем наприкінці (`.order("id")`) і `.range(from, to)`.
  Перша сторінка дає кількість, решта вантажиться паралельно.
- **`order(…, { ascending: true }).limit(N)`** бере **найстаріші** N — для «останніх N»
  сортуй desc і розвертай.
- **Кнопки дій у рядках списків:** ховати до hover лише на пристроях з мишею —
  `[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100
  [@media(hover:hover)]:focus-within:opacity-100`; на тач/PWA вони завжди видимі.

---

## 10. Команди

| Команда | Дія |
| --- | --- |
| `npm run dev` | Дев-сервер (Turbopack) |
| `npm run build` | Продакшн-збірка (також ганяє tsc) |
| `npx tsc --noEmit` | Лише перевірка типів |
| `npm run lint` | ESLint |
| `npm test` | Unit-тести (Vitest, одноразовий прогін) |
| `npm run test:watch` | Unit-тести у watch-режимі |
| `node scripts/generate-icons.js` | Перегенерувати PWA-іконки |

---

## 11. Безпека
- **RLS** — головний захист: навіть із публічним anon/publishable ключем чужі дані
  недоступні (фільтрує Postgres).
- Anon/publishable ключ публічний за дизайном (кладеться у `NEXT_PUBLIC_*`).
- `.env.local` у `.gitignore`; у репо лише `.env.example`.

---

*Технічний борг / можливі покращення: сторінки «Витрати»/«Аналітика» вантажать усю
історію на клієнт (частинами, тож нічого не губиться); при десятках тисяч записів
варто перейти на серверну агрегацію й посторінковий список. Снапшоти Net Worth зберігаються «як є» (історичні
значення не переконвертовуються при зміні базової валюти).*
