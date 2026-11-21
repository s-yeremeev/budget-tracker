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
 * Чи входить витрата в бюджет (має ліміт її категорія або підкатегорія).
 * Ліміт категорії покриває всі її витрати; якщо в категорії ліміту немає —
 * у бюджет входять лише витрати підкатегорій, що мають власний ліміт.
 * Узгоджено з `plannedTotal`.
 */
export function isInBudgetScope(
  e: { category_id: string | null; subcategory_id: string | null },
  plannedById: (id: string) => number,
): boolean {
  if (!e.category_id) return false;
  if (plannedById(e.category_id) > 0) return true;
  return !!e.subcategory_id && plannedById(e.subcategory_id) > 0;
}

/**
 * План і факт за кожною категорією та підкатегорією місяця.
 * - Категорія: витрачено = усі її витрати (разом із тими, що мають підкатегорію).
 * - Підкатегорія: витрачено = витрати з цією підкатегорією.
 * - `totalSpent`: усі витрати місяця, кожна один раз (і ті, що без категорії).
 * - `spentInBudget` / `spentOutOfBudget`: та сама сума, розділена на витрати в
 *   категоріях з лімітом і поза ними (див. `isInBudgetScope`).
 * - `totalPlanned`: див. `plannedTotal`.
 * `toBase` конвертує суму у базову валюту.
 */
export function computeBudget(
  categories: CategoryRef[],
  budgets: BudgetRecord[],
  expenses: ExpenseRecord[],
  toBase: (amount: number, currency: string) => number,
): {
  rows: Record<string, BudgetRow>;
  totalPlanned: number;
  totalSpent: number;
  spentInBudget: number;
  spentOutOfBudget: number;
} {
  const rows: Record<string, BudgetRow> = {};
  for (const c of categories) rows[c.id] = { spent: 0, planned: 0 };

  for (const b of budgets) {
    if (rows[b.category_id]) rows[b.category_id].planned = toBase(Number(b.amount), b.currency);
  }
  const plannedById = (id: string) => rows[id]?.planned ?? 0;

  let totalSpent = 0;
  let spentInBudget = 0;
  for (const e of expenses) {
    const amount = toBase(Number(e.amount), e.currency);
    totalSpent += amount;
    // Без категорії (напр. платіж по кредиту) — лише в загальну суму, «поза бюджетом».
    if (!e.category_id || !rows[e.category_id]) continue;
    rows[e.category_id].spent += amount;
    if (e.subcategory_id && rows[e.subcategory_id]) rows[e.subcategory_id].spent += amount;
    if (isInBudgetScope(e, plannedById)) spentInBudget += amount;
  }

  const totalPlanned = plannedTotal(
    categories.map((c) => ({ categoryId: c.id, parentId: c.parent_id, amount: rows[c.id].planned })),
  );

  return { rows, totalPlanned, totalSpent, spentInBudget, spentOutOfBudget: totalSpent - spentInBudget };
}

/**
 * Підсумок бюджету місяця для дашборду — без повного списку категорій.
 * `budgets` і `expenses` — суми вже у базовій валюті.
 */
export function summarizeMonthBudget(
  budgets: { categoryId: string; parentId: string | null; amount: number }[],
  expenses: { category_id: string | null; subcategory_id: string | null; amount: number }[],
): { planned: number; spentInBudget: number; spentOutOfBudget: number } {
  const planned = new Map(budgets.map((b) => [b.categoryId, b.amount]));
  const plannedById = (id: string) => planned.get(id) ?? 0;
  let spentInBudget = 0;
  let spentOutOfBudget = 0;
  for (const e of expenses) {
    if (isInBudgetScope(e, plannedById)) spentInBudget += e.amount;
    else spentOutOfBudget += e.amount;
  }
  return { planned: plannedTotal(budgets), spentInBudget, spentOutOfBudget };
}
