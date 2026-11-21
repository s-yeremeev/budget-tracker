"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/require-user";
import { recomputeNetWorth, applyAssetDeltas } from "@/lib/server/net-worth";
import { assetAmountsFor, appliedAssetAmount } from "@/lib/server/asset-amounts";
import { withColumnFallback } from "@/lib/server/db-compat";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/income");
  revalidatePath("/assets");
}

function addDelta(acc: Record<string, number>, assetId: string | null, delta: number) {
  if (!assetId) return;
  acc[assetId] = (acc[assetId] ?? 0) + delta;
}

export interface IncomeInput {
  source: string;
  amount: number;
  currency: string;
  received_at: string;
  comment: string | null;
  asset_id: string | null;
}

export async function createIncome(input: IncomeInput) {
  const { supabase, userId } = await requireUser();
  // Сума у валюті активу (якщо валюта доходу інша — за поточним курсом).
  const [assetAmount] = await assetAmountsFor([input]);
  const { error } = await withColumnFallback((withNew) =>
    supabase.from("incomes").insert({
      user_id: userId,
      source: input.source,
      amount: input.amount,
      currency: input.currency,
      received_at: input.received_at,
      comment: input.comment,
      asset_id: input.asset_id,
      ...(withNew ? { asset_amount: assetAmount } : {}),
    }),
  );
  if (error) return { error: error.message };
  // Зараховуємо суму на обраний актив (у його валюті).
  if (input.asset_id && assetAmount != null) {
    await applyAssetDeltas({ [input.asset_id]: assetAmount });
    await recomputeNetWorth(userId);
  }
  revalidateAll();
  return { error: null };
}

export async function updateIncome(id: string, input: IncomeInput) {
  const { supabase, userId } = await requireUser();
  const { data: old } = await supabase.from("incomes").select("*").eq("id", id).single();
  const [assetAmount] = await assetAmountsFor([input]);

  const { error } = await withColumnFallback((withNew) =>
    supabase
      .from("incomes")
      .update({
        source: input.source,
        amount: input.amount,
        currency: input.currency,
        received_at: input.received_at,
        comment: input.comment,
        asset_id: input.asset_id,
        ...(withNew ? { asset_amount: assetAmount } : {}),
      })
      .eq("id", id),
  );
  if (error) return { error: error.message };

  const deltas: Record<string, number> = {};
  if (old) addDelta(deltas, old.asset_id as string | null, -appliedAssetAmount(old)); // відкат рівно зарахованого
  if (assetAmount != null) addDelta(deltas, input.asset_id, assetAmount); // застосувати новий
  await applyAssetDeltas(deltas);
  if (Object.keys(deltas).length) await recomputeNetWorth(userId);

  revalidateAll();
  return { error: null };
}

export async function deleteIncome(id: string) {
  const { supabase, userId } = await requireUser();
  const { data: old } = await supabase.from("incomes").select("*").eq("id", id).single();

  const { error } = await supabase.from("incomes").delete().eq("id", id);
  if (error) return { error: error.message };

  if (old?.asset_id) {
    await applyAssetDeltas({ [old.asset_id as string]: -appliedAssetAmount(old) });
    await recomputeNetWorth(userId);
  }
  revalidateAll();
  return { error: null };
}
