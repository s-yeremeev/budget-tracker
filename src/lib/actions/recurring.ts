"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextOccurrence } from "@/lib/server/recurring";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизовано");
  return { supabase, userId: user.id };
}

function revalidateAll() {
  revalidatePath("/recurring");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
}

export interface RecurringInput {
  name: string;
  category_id: string | null;
  asset_id: string | null;
  amount: number;
  currency: string;
  day_of_month: number;
  comment: string | null;
  active: boolean;
}

export async function createRecurring(input: RecurringInput) {
  const { supabase, userId } = await requireUser();
  const next_run = nextOccurrence(input.day_of_month, new Date());
  const { error } = await supabase.from("recurring_expenses").insert({
    user_id: userId,
    name: input.name,
    category_id: input.category_id,
    asset_id: input.asset_id,
    amount: input.amount,
    currency: input.currency,
    day_of_month: input.day_of_month,
    comment: input.comment,
    active: input.active,
    next_run,
  });
  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}

export async function updateRecurring(id: string, input: RecurringInput) {
  const { supabase } = await requireUser();
  const next_run = nextOccurrence(input.day_of_month, new Date());
  const { error } = await supabase
    .from("recurring_expenses")
    .update({
      name: input.name,
      category_id: input.category_id,
      asset_id: input.asset_id,
      amount: input.amount,
      currency: input.currency,
      day_of_month: input.day_of_month,
      comment: input.comment,
      active: input.active,
      next_run,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}

export async function toggleRecurring(id: string, active: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recurring_expenses").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}

export async function deleteRecurring(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}
