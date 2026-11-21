import { createClient } from "@/lib/supabase/server";
import { getRates } from "@/lib/server/rates";
import { withColumnFallback } from "@/lib/server/db-compat";
import { netWorthTotal } from "@/lib/money";
import { toISODate } from "@/lib/utils";

/**
 * Перераховує чистий капітал користувача і оновлює снапшот на сьогодні:
 * активи (кожен конвертований у базову валюту) − залишки кредитів.
 * Снапшот позначається `converted = true` — графік показує лише такі (старі снапшоти
 * складали суми різних валют без конвертації і не віднімали борги).
 * Викликається після змін активів/кредитів і раз на день (daily-processing).
 */
export async function recomputeNetWorth(userId: string) {
  const supabase = await createClient({ fresh: true });
  const [{ data: profile }, { data: assets }, { data: credits }] = await Promise.all([
    supabase.from("profiles").select("base_currency").eq("id", userId).single(),
    supabase.from("assets").select("value, currency").eq("user_id", userId),
    supabase.from("credits").select("remaining_amount, currency").eq("user_id", userId),
  ]);
  const base = (profile as { base_currency?: string } | null)?.base_currency ?? "UAH";
  const rates = await getRates(base);
  const total = netWorthTotal(
    (assets ?? []) as { value: number; currency: string }[],
    (credits ?? []) as { remaining_amount: number; currency: string }[],
    base,
    rates,
  );

  await withColumnFallback((withNew) =>
    supabase.from("net_worth_snapshots").upsert(
      {
        user_id: userId,
        snapshot_date: toISODate(new Date()),
        total_value: total,
        currency: base,
        ...(withNew ? { converted: true } : {}),
      },
      { onConflict: "user_id,snapshot_date" },
    ),
  );
}

/**
 * Застосовує дельти до балансів активів: { [assetId]: delta } — у ВАЛЮТІ АКТИВУ.
 * Додатна дельта збільшує баланс (повернення), відʼємна — зменшує (списання).
 */
export async function applyAssetDeltas(deltas: Record<string, number>) {
  const supabase = await createClient({ fresh: true });
  const ids = Object.keys(deltas).filter((id) => deltas[id] !== 0);
  if (ids.length === 0) return;

  const { data: rows } = await supabase
    .from("assets")
    .select("id, value")
    .in("id", ids);

  await Promise.all(
    (rows ?? []).map((a: { id: string; value: number }) =>
      supabase
        .from("assets")
        .update({ value: Math.round((Number(a.value) + deltas[a.id]) * 100) / 100 })
        .eq("id", a.id),
    ),
  );
}
