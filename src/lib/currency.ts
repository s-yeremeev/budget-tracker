// Курси у форматі base→currency: скільки одиниць `currency` за 1 одиницю `base`.
export type Rates = Record<string, number>;

/**
 * Конвертує суму з валюти `from` у базову валюту `base`.
 * rates[from] = одиниць from за 1 base, тому amount_base = amount / rates[from].
 */
export function convert(amount: number, from: string, base: string, rates: Rates | null | undefined): number {
  if (!from || from === base) return amount;
  const r = rates?.[from];
  if (!r || r <= 0) return amount; // немає курсу — повертаємо як є
  return amount / r;
}
