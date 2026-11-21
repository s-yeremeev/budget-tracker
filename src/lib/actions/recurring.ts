"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextOccurrence } from "@/lib/server/recurring";
import { resetDailyProcessing } from "@/lib/server/daily-processing";
import { rescheduleNextRun } from "@/lib/money";
import { toISODate } from "@/lib/utils";

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
  await resetDailyProcessing(supabase, userId); // нарахування на сьогодні — на наступному завантаженні
  revalidateAll();
  return { error: null };
}

export async function updateRecurring(id: string, input: RecurringInput) {
  const { supabase, userId } = await requireUser();
  // Не «скидаємо» курсор на сьогодні: вже списаний місяць не спишеться вдруге,
  // а при ввімкненні після паузи не нарахуються пропущені місяці.
  const { data: current } = await supabase.from("recurring_expenses").select("next_run").eq("id", id).single();
  const next_run = rescheduleNextRun(
    (current as { next_run: string | null } | null)?.next_run ?? null,
    input.day_of_month,
    toISODate(new Date()),
  );
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
  await resetDailyProcessing(supabase, userId);
  revalidateAll();
  return { error: null };
}

export async function toggleRecurring(id: string, active: boolean) {
  const { supabase, userId } = await requireUser();
  const patch: { active: boolean; next_run?: string } = { active };
  if (active) {
    // Після паузи — наступна дата від сьогодні, без нарахування пропущених місяців.
    const { data: current } = await supabase
      .from("recurring_expenses")
      .select("next_run, day_of_month")
      .eq("id", id)
      .single();
    const cur = current as { next_run: string | null; day_of_month: number } | null;
    if (cur) patch.next_run = rescheduleNextRun(cur.next_run, cur.day_of_month, toISODate(new Date()));
  }
  const { error } = await supabase.from("recurring_expenses").update(patch).eq("id", id);
  if (error) return { error: error.message };
  if (active) await resetDailyProcessing(supabase, userId);
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
