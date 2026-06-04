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
  revalidatePath("/expenses");
  revalidatePath("/analytics");
  revalidatePath("/assets");
  revalidatePath("/budget");
}

/** Додає дельту до акумулятора коригувань балансу активів. */
function addDelta(acc: Record<string, number>, assetId: string | null, delta: number) {
  if (!assetId) return;
  acc[assetId] = (acc[assetId] ?? 0) + delta;
}

export interface ExpenseInput {
  category_id: string | null;
  subcategory_id: string | null;
  asset_id: string | null;
  amount: number;
  currency: string;
  spent_at: string;
  comment: string | null;
}

export async function createExpense(input: ExpenseInput) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("expenses").insert({
    user_id: userId,
    category_id: input.category_id,
    subcategory_id: input.subcategory_id,
    asset_id: input.asset_id,
    amount: input.amount,
    currency: input.currency,
    spent_at: input.spent_at,
    comment: input.comment,
  });
  if (error) return { error: error.message };

  // Списуємо суму з обраного активу.
  if (input.asset_id) {
    await applyAssetDeltas({ [input.asset_id]: -input.amount });
    await recomputeNetWorth(userId);
  }
  revalidateAll();
  return { error: null };
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const { supabase, userId } = await requireUser();

  // Старий стан — щоб коректно переграти вплив на активи.
  const { data: old } = await supabase
    .from("expenses")
    .select("asset_id, amount")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("expenses")
    .update({
      category_id: input.category_id,
      subcategory_id: input.subcategory_id,
      asset_id: input.asset_id,
      amount: input.amount,
      currency: input.currency,
      spent_at: input.spent_at,
      comment: input.comment,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  const deltas: Record<string, number> = {};
  if (old) addDelta(deltas, old.asset_id as string | null, Number(old.amount)); // повертаємо старе
  addDelta(deltas, input.asset_id, -input.amount); // списуємо нове
  await applyAssetDeltas(deltas);
  if (Object.keys(deltas).length) await recomputeNetWorth(userId);

  revalidateAll();
  return { error: null };
}

export async function deleteExpense(id: string) {
  const { supabase, userId } = await requireUser();

  const { data: old } = await supabase
    .from("expenses")
    .select("asset_id, amount")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };

  // Повертаємо суму на актив.
  if (old?.asset_id) {
    await applyAssetDeltas({ [old.asset_id as string]: Number(old.amount) });
    await recomputeNetWorth(userId);
  }
  revalidateAll();
  return { error: null };
}

export interface CategoryInput {
  name: string;
  icon: string;
  color: string;
  parent_id?: string | null;
}

export async function createExpenseCategory(input: CategoryInput) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("expense_categories")
    .insert({ user_id: userId, parent_id: input.parent_id ?? null, name: input.name, icon: input.icon, color: input.color })
    .select()
    .single();
  if (error) return { error: error.message, data: null };
  revalidateAll();
  revalidatePath("/settings");
  return { error: null, data };
}

export async function updateExpenseCategory(id: string, input: CategoryInput) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("expense_categories")
    .update(input)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}

export async function deleteExpenseCategory(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("expense_categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}
