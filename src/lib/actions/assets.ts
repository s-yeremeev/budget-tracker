"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeNetWorth } from "@/lib/server/net-worth";
import type { AssetType } from "@/lib/types";

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
  revalidatePath("/assets");
  revalidatePath("/expenses");
}

export interface AssetInput {
  category_id: string | null;
  name: string;
  value: number;
  currency: string;
}

export async function createAsset(input: AssetInput) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("assets")
    .insert({ user_id: userId, ...input });
  if (error) return { error: error.message };
  await recomputeNetWorth(userId);
  revalidateAll();
  return { error: null };
}

export async function updateAsset(id: string, input: AssetInput) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("assets").update(input).eq("id", id);
  if (error) return { error: error.message };
  await recomputeNetWorth(userId);
  revalidateAll();
  return { error: null };
}

export async function deleteAsset(id: string) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) return { error: error.message };
  await recomputeNetWorth(userId);
  revalidateAll();
  return { error: null };
}

/** Коригує баланс активу на delta (може бути відʼємним). Не нижче 0. */
export async function adjustAsset(id: string, delta: number) {
  const { supabase, userId } = await requireUser();
  if (!delta) return { error: "Вкажіть суму" };
  const { data: asset } = await supabase
    .from("assets")
    .select("value")
    .eq("id", id)
    .single();
  if (!asset) return { error: "Актив не знайдено" };
  const next = Math.max(0, Number(asset.value) + delta);
  const { error } = await supabase.from("assets").update({ value: next }).eq("id", id);
  if (error) return { error: error.message };
  await recomputeNetWorth(userId);
  revalidateAll();
  return { error: null };
}

export interface AssetCategoryInput {
  name: string;
  type: AssetType;
  icon: string;
  color: string;
}

export async function createAssetCategory(input: AssetCategoryInput) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("asset_categories")
    .insert({ user_id: userId, ...input })
    .select()
    .single();
  if (error) return { error: error.message, data: null };
  revalidateAll();
  return { error: null, data };
}

export async function deleteAssetCategory(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("asset_categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}
