import type { ExpenseCategory } from "@/lib/types";

// Сторінки «Витрати» й «Аналітика» вантажать усю історію. Раніше кожен рядок віз повну
// копію своєї категорії (і активу) — ~750 байт на витрату. Категорії й активи вже є на
// клієнті (useApp(), їх вантажить layout), тож сервер шле лише потрібні поля, а
// категорія/актив підставляються тут — за id.

/** Колонки витрати для списку + форми редагування (див. ExpenseItem). */
export const EXPENSE_ITEM_COLUMNS = "id, category_id, subcategory_id, asset_id, amount, currency, spent_at, comment, tags";

/** Колонки витрати для аналітики (див. AnalyticsExpense). */
export const ANALYTICS_EXPENSE_COLUMNS = "category_id, subcategory_id, amount, currency, spent_at";

type AssetRef = { id: string; name: string; currency: string };

/** Підставляє `category` (за category_id) і `asset` ({name, currency} за asset_id). Порядок рядків зберігається. */
export function withRefs<T extends { category_id: string | null; asset_id?: string | null }>(
  rows: T[],
  categories: ExpenseCategory[],
  assets: AssetRef[] = [],
): (T & { category: ExpenseCategory | null; asset: { name: string; currency: string } | null })[] {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const assetById = new Map(assets.map((a) => [a.id, { name: a.name, currency: a.currency }]));
  return rows.map((r) => ({
    ...r,
    category: (r.category_id && catById.get(r.category_id)) || null,
    asset: (r.asset_id && assetById.get(r.asset_id)) || null,
  }));
}
