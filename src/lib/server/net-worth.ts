import { createClient } from "@/lib/supabase/server";
import { toISODate } from "@/lib/utils";

/**
 * Перераховує суму активів користувача та оновлює снапшот Net Worth
 * на сьогодні. Викликається після будь-якої зміни активів або витрат,
 * привʼязаних до активів.
 */
export async function recomputeNetWorth(userId: string) {
  const supabase = await createClient();
  const { data: assets } = await supabase
    .from("assets")
    .select("value")
    .eq("user_id", userId);
  const total = (assets ?? []).reduce((s, a) => s + Number(a.value), 0);
  await supabase
    .from("net_worth_snapshots")
    .upsert(
      { user_id: userId, snapshot_date: toISODate(new Date()), total_value: total },
      { onConflict: "user_id,snapshot_date" },
    );
}

/**
 * Застосовує дельти до балансів активів: { [assetId]: delta }.
 * Додатна дельта збільшує баланс (повернення), відʼємна — зменшує (списання).
 */
export async function applyAssetDeltas(deltas: Record<string, number>) {
  const supabase = await createClient();
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
        .update({ value: Number(a.value) + deltas[a.id] })
        .eq("id", a.id),
    ),
  );
}
