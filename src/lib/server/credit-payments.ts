import { createClient } from "@/lib/supabase/server";
import { applyAssetDeltas, recomputeNetWorth } from "@/lib/server/net-worth";
import { assetAmountsFor } from "@/lib/server/asset-amounts";
import { omitKey, withColumnFallback } from "@/lib/server/db-compat";
import { toISODate } from "@/lib/utils";

function clampDay(year: number, monthIndex: number, day: number): number {
  return Math.min(day, new Date(year, monthIndex + 1, 0).getDate());
}
function addMonth(iso: string, day: number): string {
  const d = new Date(iso + "T00:00:00");
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return toISODate(new Date(y, m, clampDay(y, m, day)));
}

/**
 * Авто-платежі по кредитах: для кредитів з auto_pay і next_payment <= сьогодні
 * створює витрати-платежі (списуючи з обраного активу), зменшує залишок боргу
 * та просуває next_payment (догенеровуючи пропущені місяці). Викликається на
 * сервері під час завантаження застосунку.
 */
export async function processCreditPayments(userId: string): Promise<boolean> {
  const supabase = await createClient({ fresh: true });
  const todayISO = toISODate(new Date());

  const { data: credits } = await supabase
    .from("credits")
    .select("*")
    .eq("user_id", userId)
    .eq("auto_pay", true)
    .gt("remaining_amount", 0)
    .not("next_payment", "is", null)
    .lte("next_payment", todayISO);

  if (!credits || credits.length === 0) return false;

  const expenseRows: Record<string, unknown>[] = [];
  const deltas: Record<string, number> = {};
  const updates: { id: string; remaining_amount: number; next_payment: string | null }[] = [];

  for (const c of credits as Array<{
    id: string;
    name: string;
    currency: string;
    monthly_payment: number;
    remaining_amount: number;
    payment_day: number | null;
    payment_asset_id: string | null;
    payment_category_id: string | null;
    next_payment: string;
  }>) {
    const monthly = Number(c.monthly_payment);
    if (!c.payment_day || monthly <= 0) continue;

    let run = c.next_payment;
    let remaining = Number(c.remaining_amount);
    let guard = 0;
    while (run <= todayISO && remaining > 0 && guard < 60) {
      const charge = Math.min(monthly, remaining);
      expenseRows.push({
        user_id: userId,
        category_id: c.payment_category_id,
        asset_id: c.payment_asset_id,
        amount: charge,
        currency: c.currency,
        spent_at: run,
        comment: `Платіж по кредиту: ${c.name}`,
      });
      remaining = Math.max(0, remaining - charge);
      run = addMonth(run, c.payment_day);
      guard++;
    }
    updates.push({ id: c.id, remaining_amount: remaining, next_payment: remaining > 0 ? run : null });
  }

  if (expenseRows.length === 0) return false;

  // Списання з активу — у його валюті (якщо валюта кредиту інша — за курсом).
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
        .from("credits")
        .update({ remaining_amount: u.remaining_amount, next_payment: u.next_payment })
        .eq("id", u.id),
    ),
  );
  await applyAssetDeltas(deltas);
  if (Object.keys(deltas).length) await recomputeNetWorth(userId);
  return true;
}
