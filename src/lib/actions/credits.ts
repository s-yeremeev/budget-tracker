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

function revalidateAll() {
  revalidatePath("/credits");
  revalidatePath("/dashboard");
}

export interface CreditInput {
  lender: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  payment_day: number | null;
  currency: string;
}

export async function createCredit(input: CreditInput) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("credits").insert({
    user_id: userId,
    lender: input.lender,
    name: input.name,
    total_amount: input.total_amount,
    remaining_amount: input.remaining_amount,
    monthly_payment: input.monthly_payment,
    payment_day: input.payment_day,
    currency: input.currency,
  });
  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}

export async function updateCredit(id: string, input: CreditInput) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("credits")
    .update({
      lender: input.lender,
      name: input.name,
      total_amount: input.total_amount,
      remaining_amount: input.remaining_amount,
      monthly_payment: input.monthly_payment,
      payment_day: input.payment_day,
      currency: input.currency,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}

export async function deleteCredit(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("credits").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}

/** Записує платіж: зменшує залишок на amount (не нижче 0). */
export async function addCreditPayment(id: string, amount: number) {
  const { supabase } = await requireUser();
  if (!amount || amount <= 0) return { error: "Сума платежу має бути більшою за нуль" };
  const { data: credit } = await supabase
    .from("credits")
    .select("remaining_amount")
    .eq("id", id)
    .single();
  if (!credit) return { error: "Кредит не знайдено" };
  const next = Math.max(0, Number(credit.remaining_amount) - amount);
  const { error } = await supabase
    .from("credits")
    .update({ remaining_amount: next })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { error: null };
}
