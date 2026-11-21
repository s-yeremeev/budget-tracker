// Рішення щодо щоденного авто-нарахування за позначкою в профілі (чиста функція — для тестів).

export type DayMarker = { auto_processed_on?: string | null } | null | undefined;

/**
 * Що робити з авто-нарахуванням для профілю:
 * - "skip"   — сьогодні вже оброблено;
 * - "claim"  — ще ні: атомарно «забрати» день і обробити;
 * - "legacy" — колонки auto_processed_on ще немає (міграцію не застосовано)
 *              або профіль не прочитався: обробляємо на кожному запиті, як раніше.
 */
export function dailyProcessingAction(profile: DayMarker, today: string): "skip" | "claim" | "legacy" {
  if (!profile || !("auto_processed_on" in profile)) return "legacy";
  return profile.auto_processed_on === today ? "skip" : "claim";
}
