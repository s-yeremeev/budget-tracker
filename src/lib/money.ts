// Чисті функції грошової логіки (без React і Supabase) — покриті тестами.
import { convert, type Rates } from "@/lib/currency";

/** Округлення до копійок (numeric(14,2) у БД). */
export const round2 = (x: number) => Math.round(x * 100) / 100;

const pad = (n: number) => String(n).padStart(2, "0");

/** Дата з днем `day` у місяці (month0 — з нуля), обмежена довжиною місяця: 31 → 30/28. */
function occurrence(year: number, month0: number, day: number): string {
  const y = year + Math.floor(month0 / 12);
  const m = ((month0 % 12) + 12) % 12;
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return `${y}-${pad(m + 1)}-${pad(Math.min(day, dim))}`;
}

/**
 * Наступна дата списання при редагуванні / повторному ввімкненні шаблону чи кредиту.
 *
 * `oldNextRun` — поточний курсор (перший ще НЕ списаний період). Беремо дату з новим днем
 * у тому ж місяці, що й курсор:
 * - якщо вона сьогодні або пізніше — це і є наступне списання (вже оплачений місяць
 *   не списується вдруге: курсор після оплати стоїть на наступному місяці);
 * - якщо вже минула (шаблон був вимкнений, або день перенесли на раніше) — найближча
 *   дата від сьогодні, БЕЗ нарахування пропущених місяців.
 * Без курсора — просто найближча дата від сьогодні.
 */
export function rescheduleNextRun(oldNextRun: string | null, day: number, today: string): string {
  if (oldNextRun) {
    const [y, m] = oldNextRun.split("-").map(Number);
    const sameMonth = occurrence(y, m - 1, day);
    if (sameMonth >= today) return sameMonth;
  }
  const [ty, tm] = today.split("-").map(Number);
  const thisMonth = occurrence(ty, tm - 1, day);
  return thisMonth >= today ? thisMonth : occurrence(ty, tm, day);
}

/**
 * Сума у валюті активу (рахунку), яку треба списати/зарахувати.
 * `assetRates` — курси з базою = валюта активу (getRates(assetCurrency)).
 */
export function toAssetAmount(amount: number, currency: string, assetCurrency: string, assetRates: Rates): number {
  return round2(convert(amount, currency, assetCurrency, assetRates));
}

/** Чистий капітал у базовій валюті: активи − залишки кредитів. */
export function netWorthTotal(
  assets: { value: number; currency: string }[],
  credits: { remaining_amount: number; currency: string }[],
  base: string,
  rates: Rates,
): number {
  const a = assets.reduce((s, x) => s + convert(Number(x.value), x.currency, base, rates), 0);
  const d = credits.reduce((s, x) => s + convert(Number(x.remaining_amount), x.currency, base, rates), 0);
  return round2(a - d);
}
