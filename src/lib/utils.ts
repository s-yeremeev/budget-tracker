import { CURRENCIES, type CurrencyCode } from "@/lib/constants";

/** Обʼєднує класи, відкидаючи порожні (легкий аналог clsx). */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const symbolOf = (code: string) =>
  CURRENCIES.find((c) => c.code === code)?.symbol ?? code;

/** Форматує суму як валюту українською. */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode | string = "UAH",
  opts: { compact?: boolean; sign?: boolean } = {},
): string {
  const { compact = false, sign = false } = opts;
  const formatter = new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact ? "compact" : "standard",
  });
  const prefix = sign && amount > 0 ? "+" : "";
  return `${prefix}${formatter.format(amount)} ${symbolOf(currency)}`;
}

/** Форматує число без валюти. */
export function formatNumber(amount: number, compact = false): string {
  return new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact ? "compact" : "standard",
  }).format(amount);
}

/** Відсоток зміни між двома значеннями. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

const MONTHS_UK = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
];
const MONTHS_UK_NOM = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
];

/** "5 червня 2026" */
export function formatDateUk(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate()} ${MONTHS_UK[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Червень 2026" */
export function formatMonthUk(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${MONTHS_UK_NOM[d.getMonth()]} ${d.getFullYear()}`;
}

/** Локальна дата у форматі YYYY-MM-DD (без зсуву часового поясу). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Перший і останній день місяця, в якому лежить дата. */
export function monthBounds(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

/** Кількість днів у місяці. */
export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Наступна дата платежу для заданого дня місяця (>= сьогодні). */
export function nextPaymentDate(day: number, from: Date = new Date()): Date {
  const clamp = (yy: number, mm: number) => Math.min(day, new Date(yy, mm + 1, 0).getDate());
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let cand = new Date(today.getFullYear(), today.getMonth(), clamp(today.getFullYear(), today.getMonth()));
  if (cand < today) {
    cand = new Date(today.getFullYear(), today.getMonth() + 1, clamp(today.getFullYear(), today.getMonth() + 1));
  }
  return cand;
}

/** Кількість днів до дати (0 = сьогодні). */
export function daysUntil(date: Date, from: Date = new Date()): number {
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const b = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/** Ініціали для аватара. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").concat(parts[1]?.[0] ?? "").toUpperCase() || "?";
}
