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

/** Створює або оновлює ліміт для категорії на місяць. amount=0 видаляє ліміт. */
export async function setBudget(input: {
  category_id: string;
  period: string; // YYYY-MM-01
  amount: number;
  currency: string;
}) {
  const { supabase, userId } = await requireUser();

  if (!input.amount || input.amount <= 0) {
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("user_id", userId)
      .eq("category_id", input.category_id)
      .eq("period", input.period);
    if (error) return { error: error.message };
    revalidatePath("/budget");
    revalidatePath("/dashboard");
    return { error: null };
  }

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: userId,
      category_id: input.category_id,
      period: input.period,
      amount: input.amount,
      currency: input.currency,
    },
    { onConflict: "user_id,category_id,period" },
  );
  if (error) return { error: error.message };
  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { error: null };
}

/** Копіює всі ліміти з попереднього місяця у вказаний. */
export async function copyBudgetFromPrevMonth(period: string) {
  const { supabase, userId } = await requireUser();

  const cur = new Date(period + "T00:00:00");
  const prev = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
  const prevPeriod = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: prevBudgets, error: readErr } = await supabase
    .from("budgets")
    .select("category_id, amount, currency")
    .eq("user_id", userId)
    .eq("period", prevPeriod);
  if (readErr) return { error: readErr.message };
  if (!prevBudgets || prevBudgets.length === 0) {
    return { error: "У попередньому місяці немає планів для копіювання." };
  }

  const rows = prevBudgets.map((b) => ({
    user_id: userId,
    category_id: b.category_id as string,
    period,
    amount: b.amount as number,
    currency: b.currency as string,
  }));

  const { error } = await supabase
    .from("budgets")
    .upsert(rows, { onConflict: "user_id,category_id,period" });
  if (error) return { error: error.message };
  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { error: null };
}
