// Порівняння періодів «яблука з яблуками»: поточний неповний місяць/рік
// порівнюємо з тим самим відрізком попереднього, а не з повним.
import { toISODate } from "@/lib/utils";

/**
 * Той самий відрізок попереднього місяця: з 1-го по той самий день
 * (обмежений довжиною попереднього місяця: 31 березня → 28/29 лютого).
 */
export function samePeriodPrevMonth(ref: Date): { start: string; end: string } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const dimPrev = new Date(y, m, 0).getDate();
  return {
    start: toISODate(new Date(y, m - 1, 1)),
    end: toISODate(new Date(y, m - 1, Math.min(ref.getDate(), dimPrev))),
  };
}

/** Той самий відрізок попереднього року: з 1 січня по ту саму дату (29.02 → 28.02). */
export function samePeriodPrevYear(ref: Date): { start: string; end: string } {
  const y = ref.getFullYear() - 1;
  const m = ref.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  return {
    start: toISODate(new Date(y, 0, 1)),
    end: toISODate(new Date(y, m, Math.min(ref.getDate(), dim))),
  };
}

/** Прогноз на кінець місяця за поточним темпом (сума / минулі дні × днів у місяці). */
export function monthEndForecast(spentSoFar: number, ref: Date): number {
  const day = ref.getDate();
  const dim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  return day > 0 ? (spentSoFar / day) * dim : spentSoFar;
}
