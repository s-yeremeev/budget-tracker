// Розрахунок місячного бюджету (план / факт) для категорій і підкатегорій.
// Чисті функції без React і Supabase — спільні для сторінки «Бюджет» та дашборду.

export interface BudgetRow {
  spent: number;
  planned: number;
}

export interface PlannedItem {
  categoryId: string;
  /** null — верхня категорія, інакше id батьківської категорії. */
  parentId: string | null;
  /** Ліміт у базовій валюті. */
  amount: number;
}

/**
 * Загальний план місяця без подвійного рахунку.
 * Ліміт верхньої категорії вже охоплює її підкатегорії, тож ліміти підкатегорій
 * додаються до загальної суми лише тоді, коли в батьківської категорії ліміту немає.
 */
export function plannedTotal(items: PlannedItem[]): number {
  const parentsWithPlan = new Set(
    items.filter((i) => !i.parentId && i.amount > 0).map((i) => i.categoryId),
  );
  let total = 0;
  for (const i of items) {
    if (i.amount <= 0) continue;
    if (!i.parentId || !parentsWithPlan.has(i.parentId)) total += i.amount;
  }
  return total;
}

interface CategoryRef {
  id: string;
  parent_id: string | null;
}
interface BudgetRecord {
  category_id: string;
  amount: number;
  currency: string;
}
interface ExpenseRecord {
  category_id: string | null;
  subcategory_id: string | null;
  amount: number;
  currency: string;
}

/**
 * План і факт за кожною категорією та підкатегорією місяця.
 * - Категорія: витрачено = усі її витрати (разом із тими, що мають підкатегорію).
 * - Підкатегорія: витрачено = витрати з цією підкатегорією.
 * - `totalSpent`: кожна витрата рахується один раз (за верхньою категорією).
 * - `totalPlanned`: див. `plannedTotal`.
 * `toBase` конвертує суму у базову валюту.
 */
export function computeBudget(
  categories: CategoryRef[],
  budgets: BudgetRecord[],
  expenses: ExpenseRecord[],
  toBase: (amount: number, currency: string) => number,
): { rows: Record<string, BudgetRow>; totalPlanned: number; totalSpent: number } {
  const rows: Record<string, BudgetRow> = {};
  for (const c of categories) rows[c.id] = { spent: 0, planned: 0 };

  for (const b of budgets) {
    if (rows[b.category_id]) rows[b.category_id].planned = toBase(Number(b.amount), b.currency);
  }

  let totalSpent = 0;
  for (const e of expenses) {
    if (!e.category_id || !rows[e.category_id]) continue;
    const amount = toBase(Number(e.amount), e.currency);
    rows[e.category_id].spent += amount;
    totalSpent += amount;
    if (e.subcategory_id && rows[e.subcategory_id]) rows[e.subcategory_id].spent += amount;
  }

  const totalPlanned = plannedTotal(
    categories.map((c) => ({ categoryId: c.id, parentId: c.parent_id, amount: rows[c.id].planned })),
  );

  return { rows, totalPlanned, totalSpent };
}
