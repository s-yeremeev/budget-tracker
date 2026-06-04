"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизовано");
  return { supabase, userId: user.id };
}

export interface GoalInput {
  name: string;
  icon: string;
  color: string;
  target_amount: number;
  current_amount: number;
  asset_id: string | null;
  currency: string;
  target_date: string | null;
}

export async function createGoal(input: GoalInput) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    name: input.name,
    icon: input.icon,
    color: input.color,
    target_amount: input.target_amount,
    current_amount: input.asset_id ? 0 : input.current_amount,
    asset_id: input.asset_id,
    currency: input.currency,
    target_date: input.target_date,
  });
  if (error) return { error: error.message };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateGoal(id: string, input: GoalInput) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("goals")
    .update({
      name: input.name,
      icon: input.icon,
      color: input.color,
      target_amount: input.target_amount,
      current_amount: input.asset_id ? 0 : input.current_amount,
      asset_id: input.asset_id,
      currency: input.currency,
      target_date: input.target_date,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteGoal(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { error: null };
}

/** Додає внесок до ручної цілі (current_amount += delta, не нижче 0). */
export async function addGoalContribution(id: string, delta: number) {
  const { supabase } = await requireUser();
  const { data: goal } = await supabase
    .from("goals")
    .select("current_amount, asset_id")
    .eq("id", id)
    .single();
  if (!goal) return { error: "Ціль не знайдено" };
  if (goal.asset_id) return { error: "Ціль привʼязана до активу — внесок недоступний" };
  const next = Math.max(0, Number(goal.current_amount) + delta);
  const { error } = await supabase.from("goals").update({ current_amount: next }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { error: null };
}
