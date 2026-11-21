// Фільтр витрат за категорією та підкатегорією.
// Спільний для сторінки «Витрати» та аналітики (порівняння за місяцями).

/** Значення фільтра «без обмеження». */
export const FILTER_ALL = "all";
/** Значення фільтра «не задано»: без категорії / без підкатегорії. */
export const FILTER_NONE = "none";

interface Categorized {
  category_id: string | null;
  subcategory_id: string | null;
}

/**
 * Чи підходить витрата під фільтр.
 * - `categoryFilter`: "all" | "none" (без категорії) | id верхньої категорії.
 * - `subcategoryFilter`: "all" | "none" (без підкатегорії) | id підкатегорії.
 *   Враховується лише тоді, коли обрано конкретну категорію.
 */
export function matchesCategoryFilter(
  expense: Categorized,
  categoryFilter: string,
  subcategoryFilter: string = FILTER_ALL,
): boolean {
  if (categoryFilter === FILTER_ALL) return true;
  if (categoryFilter === FILTER_NONE) return expense.category_id == null;
  if (expense.category_id !== categoryFilter) return false;

  if (subcategoryFilter === FILTER_ALL) return true;
  if (subcategoryFilter === FILTER_NONE) return expense.subcategory_id == null;
  return expense.subcategory_id === subcategoryFilter;
}

/** Підкатегорії обраної категорії (порожньо для "all" / "none"). */
export function subcategoriesOf<T extends { parent_id: string | null }>(
  categories: T[],
  categoryFilter: string,
): T[] {
  if (categoryFilter === FILTER_ALL || categoryFilter === FILTER_NONE) return [];
  return categories.filter((c) => c.parent_id === categoryFilter);
}
