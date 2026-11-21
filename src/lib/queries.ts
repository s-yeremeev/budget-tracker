import { createClient } from "@/lib/supabase/server";
import { monthBounds, toISODate } from "@/lib/utils";
import { convert, type Rates } from "@/lib/currency";
import { fetchAll } from "@/lib/fetch-all";

import { getCurrentUserId } from "@/lib/server/session";
import { samePeriodPrevMonth } from "@/lib/periods";
import type {
  Asset,
  AssetCategory,
  ExpenseCategory,
  ExpenseWithCategory,
} from "@/lib/types";

/** Id поточного користувача (спільний з layout у межах рендера — див. lib/server/session). */
export function getUserId() {
  return getCurrentUserId();
}

/** Активи + категорії + загальний Net Worth (у базовій валюті). */
export async function getAssetsData(userId: string, base: string, rates: Rates) {
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
  const total = list.reduce((s, a) => s + convert(Number(a.value), a.currency, base, rates), 0);
  return {
    assets: list,
    categories: (categories as AssetCategory[]) ?? [],
    total,
  };
}

/**
 * Серія снапшотів чистого капіталу для графіка — лише коректні (`converted`: у базовій
 * валюті з відніманням боргів) і в поточній базовій валюті. Старі снапшоти складали
 * суми різних валют як є, тож вони лишаються в БД, але не показуються.
 * Якщо міграцію ще не застосовано (колонки немає) — порожньо: графік покаже лише «сьогодні».
 */
export async function getNetWorthSeries(userId: string, base: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("net_worth_snapshots")
    .select("snapshot_date, total_value")
    .eq("user_id", userId)
    .eq("converted", true)
    .eq("currency", base)
    // Останні 180 днів: беремо найновіші й розвертаємо в хронологічний порядок
    // (з ascending+limit графік після пів року «застигав» на найстаріших знімках).
    .order("snapshot_date", { ascending: false })
    .limit(180);
  if (error) return [];
  return (data ?? [])
    .map((s) => ({
      date: s.snapshot_date as string,
      value: Number(s.total_value),
    }))
    .reverse();
}

/** Витрати за період [start, end] з категоріями. */
export async function getExpenses(userId: string, start: string, end: string) {
  const supabase = await createClient();
  const rows = await fetchAll((from, to) =>
    supabase
      .from("expenses")
      .select("*, category:expense_categories!expenses_category_id_fkey(*), asset:assets(name, currency)", {
        count: "exact",
      })
      .eq("user_id", userId)
      .gte("spent_at", start)
      .lte("spent_at", end)
      .order("spent_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return rows as unknown as ExpenseWithCategory[];
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

/** Агрегує витрати за категоріями (суми у базовій валюті). */
export function aggregateByCategory(
  expenses: ExpenseWithCategory[],
  base: string,
  rates: Rates,
): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const e of expenses) {
    const key = e.category?.id ?? "none";
    const amount = convert(Number(e.amount), e.currency, base, rates);
    const existing = map.get(key);
    if (existing) {
      existing.total += amount;
    } else {
      map.set(key, {
        id: key,
        name: e.category?.name ?? "Без категорії",
        color: e.category?.color ?? "#64748b",
        icon: e.category?.icon ?? "Tag",
        total: amount,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/**
 * Сума витрат за поточний місяць і попередній (у базовій валюті):
 * `previous` — увесь попередній місяць, `previousSamePeriod` — ті самі дні (1…сьогодні),
 * щоб порівнювати неповний поточний місяць чесно.
 */
export async function getMonthComparison(userId: string, ref: Date, base: string, rates: Rates) {
  return compareMonths("expenses", "spent_at", userId, ref, base, rates);
}

async function compareMonths(
  table: "expenses" | "incomes",
  dateCol: "spent_at" | "received_at",
  userId: string,
  ref: Date,
  base: string,
  rates: Rates,
) {
  const supabase = await createClient();
  const cur = monthBounds(ref);
  const prev = monthBounds(new Date(ref.getFullYear(), ref.getMonth() - 1, 1));
  const same = samePeriodPrevMonth(ref);

  const rowsBetween = async (start: string, end: string) => {
    const rows = await fetchAll((from, to) =>
      supabase
        .from(table)
        .select(`amount, currency, ${dateCol}`, { count: "exact" })
        .eq("user_id", userId)
        .gte(dateCol, start)
        .lte(dateCol, end)
        .order("id")
        .range(from, to),
    );
    return rows as unknown as Record<string, string | number>[];
  };
  const sum = (rows: Record<string, string | number>[]) =>
    rows.reduce((s, r) => s + convert(Number(r.amount), String(r.currency), base, rates), 0);

  const [curRows, prevRows] = await Promise.all([rowsBetween(cur.start, cur.end), rowsBetween(prev.start, prev.end)]);
  return {
    current: sum(curRows),
    previous: sum(prevRows),
    previousSamePeriod: sum(prevRows.filter((r) => String(r[dateCol]) <= same.end)),
  };
}

/**
 * Ліміти бюджету на місяць (у базовій валюті) з батьківською категорією —
 * для `summarizeMonthBudget` (план без подвійного рахунку + витрати в межах лімітів).
 */
export async function getMonthBudgetItems(userId: string, ref: Date, base: string, rates: Rates) {
  const supabase = await createClient();
  const period = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-01`;
  const { data } = await supabase
    .from("budgets")
    .select("category_id, amount, currency, category:expense_categories(parent_id)")
    .eq("user_id", userId)
    .eq("period", period);
  const rows = (data ?? []) as unknown as {
    category_id: string;
    amount: number;
    currency: string;
    category: { parent_id: string | null } | null;
  }[];
  return rows.map((b) => ({
    categoryId: b.category_id,
    parentId: b.category?.parent_id ?? null,
    amount: convert(Number(b.amount), b.currency, base, rates),
  }));
}

/** Доходи за період [start, end] з підтягнутим активом. */
export async function getIncomes(userId: string, start: string, end: string) {
  const supabase = await createClient();
  const rows = await fetchAll((from, to) =>
    supabase
      .from("incomes")
      .select("*, asset:assets(name, currency)", { count: "exact" })
      .eq("user_id", userId)
      .gte("received_at", start)
      .lte("received_at", end)
      .order("received_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return rows as unknown as import("@/lib/types").IncomeWithAsset[];
}

/** Сума доходів за поточний та попередній місяць (у базовій валюті). */
export async function getMonthIncome(userId: string, ref: Date, base: string, rates: Rates) {
  return compareMonths("incomes", "received_at", userId, ref, base, rates);
}

/** Цілі користувача (з підтягнутим активом). */
export async function getGoals(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*, asset:assets(value, currency)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as unknown as import("@/lib/types").GoalWithAsset[]) ?? [];
}

/** Кредити користувача. */
export async function getCredits(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credits")
    .select("*")
    .eq("user_id", userId)
    .order("remaining_amount", { ascending: false });
  return (data as unknown as import("@/lib/types").Credit[]) ?? [];
}

/** Сума залишків за всіма кредитами у базовій валюті (загальний борг). */
export async function getCreditsTotal(userId: string, base: string, rates: Rates) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credits")
    .select("remaining_amount, currency")
    .eq("user_id", userId);
  return (data ?? []).reduce((s, c) => s + convert(Number(c.remaining_amount), c.currency, base, rates), 0);
}

export { monthBounds, toISODate };
