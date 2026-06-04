"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeNetWorth, applyAssetDeltas } from "@/lib/server/net-worth";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизовано");
  return { supabase, userId: user.id };
}

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
  const { error } = await supabase.from("incomes").insert({
    user_id: userId,
    source: input.source,
    amount: input.amount,
    currency: input.currency,
    received_at: input.received_at,
    comment: input.comment,
    asset_id: input.asset_id,
  });
  if (error) return { error: error.message };
  // Зараховуємо суму на обраний актив (дохід збільшує баланс).
  if (input.asset_id) {
    await applyAssetDeltas({ [input.asset_id]: input.amount });
    await recomputeNetWorth(userId);
  }
  revalidateAll();
  return { error: null };
}

export async function updateIncome(id: string, input: IncomeInput) {
  const { supabase, userId } = await requireUser();
  const { data: old } = await supabase
    .from("incomes")
    .select("asset_id, amount")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("incomes")
    .update({
      source: input.source,
      amount: input.amount,
      currency: input.currency,
      received_at: input.received_at,
      comment: input.comment,
      asset_id: input.asset_id,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  const deltas: Record<string, number> = {};
  if (old) addDelta(deltas, old.asset_id as string | null, -Number(old.amount)); // відкат старого
  addDelta(deltas, input.asset_id, input.amount); // застосувати новий
  await applyAssetDeltas(deltas);
  if (Object.keys(deltas).length) await recomputeNetWorth(userId);

  revalidateAll();
  return { error: null };
}

export async function deleteIncome(id: string) {
  const { supabase, userId } = await requireUser();
  const { data: old } = await supabase
    .from("incomes")
    .select("asset_id, amount")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("incomes").delete().eq("id", id);
  if (error) return { error: error.message };

  if (old?.asset_id) {
    await applyAssetDeltas({ [old.asset_id as string]: -Number(old.amount) });
    await recomputeNetWorth(userId);
  }
  revalidateAll();
  return { error: null };
}
