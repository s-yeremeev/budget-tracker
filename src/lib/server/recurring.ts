import { createClient } from "@/lib/supabase/server";
import { applyAssetDeltas, recomputeNetWorth } from "@/lib/server/net-worth";
import { toISODate } from "@/lib/utils";

/** День місяця, обмежений кількістю днів у місяці (29→28 у лютому тощо). */
function clampDay(year: number, monthIndex: number, day: number): number {
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(day, dim);
}

/** Наступна дата нарахування (>= from) для заданого дня місяця. */
export function nextOccurrence(day: number, from: Date): string {
  const y = from.getFullYear();
  const m = from.getMonth();
  const fromISO = toISODate(from);
  const candISO = toISODate(new Date(y, m, clampDay(y, m, day)));
  if (candISO >= fromISO) return candISO;
  return toISODate(new Date(y, m + 1, clampDay(y, m + 1, day)));
}

/** Та сама дата наступного місяця (з урахуванням довжини місяця). */
function addMonth(iso: string, day: number): string {
  const d = new Date(iso + "T00:00:00");
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return toISODate(new Date(y, m, clampDay(y, m, day)));
}

/**
 * Ліниве «нарахування»: генерує витрати для всіх повторюваних шаблонів,
 * у яких next_run <= сьогодні (догенеровуючи пропущені місяці).
 * Викликається на сервері під час завантаження застосунку.
 */
export async function processRecurring(userId: string) {
  const supabase = await createClient();
  const todayISO = toISODate(new Date());

  const { data: items } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .lte("next_run", todayISO);

  if (!items || items.length === 0) return;

  const expenseRows: Record<string, unknown>[] = [];
  const deltas: Record<string, number> = {};
  const updates: { id: string; next_run: string }[] = [];

  for (const r of items as Array<{
    id: string;
    category_id: string | null;
    asset_id: string | null;
    name: string;
    amount: number;
    currency: string;
    day_of_month: number;
    comment: string | null;
    next_run: string;
  }>) {
    let run = r.next_run;
    let guard = 0;
    while (run <= todayISO && guard < 60) {
      expenseRows.push({
        user_id: userId,
        category_id: r.category_id,
        asset_id: r.asset_id,
        amount: r.amount,
        currency: r.currency,
        spent_at: run,
        comment: r.comment ? `${r.name} · ${r.comment}` : r.name,
      });
      if (r.asset_id) deltas[r.asset_id] = (deltas[r.asset_id] ?? 0) - Number(r.amount);
      run = addMonth(run, r.day_of_month);
      guard++;
    }
    updates.push({ id: r.id, next_run: run });
  }

  if (expenseRows.length === 0) return;

  await supabase.from("expenses").insert(expenseRows);
  await Promise.all(
    updates.map((u) =>
      supabase
        .from("recurring_expenses")
        .update({ next_run: u.next_run, last_run: todayISO })
        .eq("id", u.id),
    ),
  );
  await applyAssetDeltas(deltas);
  if (Object.keys(deltas).length) await recomputeNetWorth(userId);
}
