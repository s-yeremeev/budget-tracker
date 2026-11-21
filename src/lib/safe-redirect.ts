/**
 * Безпечний шлях для редиректу після входу (?redirect=...): лише внутрішній шлях цього ж сайту.
 * Відкидає абсолютні URL, «//evil.com», «/\\evil.com», «@evil.com», javascript: тощо
 * (open redirect → фішинг). Інакше — `fallback`.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || typeof value !== "string") return fallback;
  // Тільки відносний шлях від кореня, без протокол-відносних «//» і «/\».
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Керівні символи/пробіли (обхід через табуляцію чи перенос рядка) — відкидаємо.
  if (/[\u0000-\u001f\u007f\s\\]/.test(value)) return fallback;
  try {
    const base = "https://app.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
