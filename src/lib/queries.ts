import { createClient } from "@/lib/supabase/server";
import { monthBounds, toISODate } from "@/lib/utils";
import type {
  Asset,
  AssetCategory,
  ExpenseCategory,
  ExpenseWithCategory,
} from "@/lib/types";

export async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Активи + категорії + загальний Net Worth. */
export async function getAssetsData(userId: string) {
  const supabase = await createClient();
  const [{ data: assets }, { data: categories }] = await Promise.all([
    supabase
      .from("assets")
      .select("*")
      .eq("user_id", userId)
      .order("value", { ascending: false }),
    supabase
      .from("asset_categories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);
  const list = (assets as Asset[]) ?? [];
  const total = list.reduce((s, a) => s + Number(a.value), 0);
  return {
    assets: list,
    categories: (categories as AssetCategory[]) ?? [],
    total,
  };
}

/** Серія снапшотів Net Worth для графіка. */
export async function getNetWorthSeries(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("net_worth_snapshots")
    .select("snapshot_date, total_value")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: true })
    .limit(180);
  return (data ?? []).map((s) => ({
    date: s.snapshot_date as string,
    value: Number(s.total_value),
  }));
}

/** Витрати за період [start, end] з категоріями. */
export async function getExpenses(userId: string, start: string, end: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("*, category:expense_categories!expenses_category_id_fkey(*), asset:assets(name, currency)")
    .eq("user_id", userId)
    .gte("spent_at", start)
    .lte("spent_at", end)
    .order("spent_at", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as unknown as ExpenseWithCategory[]) ?? [];
}

/** Останні N витрат. */
export async function getRecentExpenses(userId: string, limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("*, category:expense_categories!expenses_category_id_fkey(*), asset:assets(name, currency)")
    .eq("user_id", userId)
    .order("spent_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as unknown as ExpenseWithCategory[]) ?? [];
}

export interface CategoryTotal {
  id: string;
  name: string;
  color: string;
  icon: string;
  total: number;
}

/** Агрегує витрати за категоріями. */
export function aggregateByCategory(expenses: ExpenseWithCategory[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const e of expenses) {
    const key = e.category?.id ?? "none";
    const existing = map.get(key);
    if (existing) {
      existing.total += Number(e.amount);
    } else {
      map.set(key, {
        id: key,
        name: e.category?.name ?? "Без категорії",
        color: e.category?.color ?? "#64748b",
        icon: e.category?.icon ?? "Tag",
        total: Number(e.amount),
      });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Сума витрат за поточний та попередній місяць. */
export async function getMonthComparison(userId: string, ref: Date) {
  const supabase = await createClient();
  const cur = monthBounds(ref);
  const prevRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const prev = monthBounds(prevRef);

  const sumBetween = async (start: string, end: string) => {
    const { data } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", userId)
      .gte("spent_at", start)
      .lte("spent_at", end);
    return (data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  };

  const [current, previous] = await Promise.all([
    sumBetween(cur.start, cur.end),
    sumBetween(prev.start, prev.end),
  ]);
  return { current, previous };
}

/** Сума запланованого бюджету на місяць (period = 1-ше число). */
export async function getMonthBudgetTotal(userId: string, ref: Date) {
  const supabase = await createClient();
  const period = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-01`;
  const { data } = await supabase
    .from("budgets")
    .select("amount")
    .eq("user_id", userId)
    .eq("period", period);
  return (data ?? []).reduce((s, b) => s + Number(b.amount), 0);
}

/** Доходи за період [start, end] з підтягнутим активом. */
export async function getIncomes(userId: string, start: string, end: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("incomes")
    .select("*, asset:assets(name, currency)")
    .eq("user_id", userId)
    .gte("received_at", start)
    .lte("received_at", end)
    .order("received_at", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as unknown as import("@/lib/types").IncomeWithAsset[]) ?? [];
}

/** Сума доходів за поточний та попередній місяць. */
export async function getMonthIncome(userId: string, ref: Date) {
  const supabase = await createClient();
  const cur = monthBounds(ref);
  const prevRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const prev = monthBounds(prevRef);
  const sumBetween = async (start: string, end: string) => {
    const { data } = await supabase
      .from("incomes")
      .select("amount")
      .eq("user_id", userId)
      .gte("received_at", start)
      .lte("received_at", end);
    return (data ?? []).reduce((s, i) => s + Number(i.amount), 0);
  };
  const [current, previous] = await Promise.all([
    sumBetween(cur.start, cur.end),
    sumBetween(prev.start, prev.end),
  ]);
  return { current, previous };
}

/** Сума залишків за всіма кредитами (загальний борг). */
export async function getCreditsTotal(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credits")
    .select("remaining_amount")
    .eq("user_id", userId);
  return (data ?? []).reduce((s, c) => s + Number(c.remaining_amount), 0);
}

export { monthBounds, toISODate };
