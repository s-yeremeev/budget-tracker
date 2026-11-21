import { createClient } from "@/lib/supabase/server";
import { applyAssetDeltas, recomputeNetWorth } from "@/lib/server/net-worth";
import { assetAmountsFor } from "@/lib/server/asset-amounts";
import { omitKey, withColumnFallback } from "@/lib/server/db-compat";
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
export async function processRecurring(userId: string): Promise<boolean> {
  const supabase = await createClient({ fresh: true });
  const todayISO = toISODate(new Date());

  const { data: items } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .lte("next_run", todayISO);

  if (!items || items.length === 0) return false;

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
      run = addMonth(run, r.day_of_month);
      guard++;
    }
    updates.push({ id: r.id, next_run: run });
  }

  if (expenseRows.length === 0) return false;

  // Списання з активу — у його валюті (якщо валюта підписки інша — за курсом).
  const assetAmounts = await assetAmountsFor(expenseRows as { asset_id: string | null; amount: number; currency: string }[]);
  expenseRows.forEach((row, i) => {
    const a = assetAmounts[i];
    row.asset_amount = a;
    if (a != null) deltas[row.asset_id as string] = (deltas[row.asset_id as string] ?? 0) - a;
  });

  await withColumnFallback((withNew) =>
    supabase
      .from("expenses")
      .insert(withNew ? expenseRows : omitKey(expenseRows, "asset_amount")),
  );
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
  return true;
}
