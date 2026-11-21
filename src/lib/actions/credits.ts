"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/require-user";
import { nextOccurrence } from "@/lib/server/recurring";
import { resetDailyProcessing } from "@/lib/server/daily-processing";
import { recomputeNetWorth } from "@/lib/server/net-worth";
import { rescheduleNextRun } from "@/lib/money";
import { toISODate } from "@/lib/utils";

function revalidateAll() {
  revalidatePath("/credits");
  revalidatePath("/dashboard");
  revalidatePath("/assets"); // чистий капітал там теж віднімає борги
}

export interface CreditInput {
  lender: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  payment_day: number | null;
  auto_pay: boolean;
  payment_asset_id: string | null;
  payment_category_id: string | null;
  currency: string;
}

/**
 * Курсор наступного авто-платежу (або null, якщо авто-оплата вимкнена).
 * При редагуванні враховує поточний курсор: вже списаний цього місяця платіж
 * не спишеться вдруге (див. rescheduleNextRun).
 */
function computeNextPayment(input: CreditInput, currentNextPayment: string | null = null): string | null {
  if (input.auto_pay && input.payment_day) {
    return currentNextPayment
      ? rescheduleNextRun(currentNextPayment, input.payment_day, toISODate(new Date()))
      : nextOccurrence(input.payment_day, new Date());
  }
  return null;
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
    auto_pay: input.auto_pay,
    payment_asset_id: input.payment_asset_id,
    payment_category_id: input.payment_category_id,
    next_payment: computeNextPayment(input),
    currency: input.currency,
  });
  if (error) return { error: error.message };
  if (input.auto_pay) await resetDailyProcessing(supabase, userId); // авто-платіж на сьогодні — на наступному завантаженні
  await recomputeNetWorth(userId); // борг входить у чистий капітал
  revalidateAll();
  return { error: null };
}

export async function updateCredit(id: string, input: CreditInput) {
  const { supabase, userId } = await requireUser();
  const { data: current } = await supabase.from("credits").select("next_payment").eq("id", id).single();
  const currentNext = (current as { next_payment: string | null } | null)?.next_payment ?? null;
  const { error } = await supabase
    .from("credits")
    .update({
      lender: input.lender,
      name: input.name,
      total_amount: input.total_amount,
      remaining_amount: input.remaining_amount,
      monthly_payment: input.monthly_payment,
      payment_day: input.payment_day,
      auto_pay: input.auto_pay,
      payment_asset_id: input.payment_asset_id,
      payment_category_id: input.payment_category_id,
      next_payment: computeNextPayment(input, currentNext),
      currency: input.currency,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  if (input.auto_pay) await resetDailyProcessing(supabase, userId);
  await recomputeNetWorth(userId);
  revalidateAll();
  return { error: null };
}

export async function deleteCredit(id: string) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("credits").delete().eq("id", id);
  if (error) return { error: error.message };
  await recomputeNetWorth(userId);
  revalidateAll();
  return { error: null };
}

/** Записує платіж: зменшує залишок на amount (не нижче 0). */
export async function addCreditPayment(id: string, amount: number) {
  const { supabase, userId } = await requireUser();
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
  await recomputeNetWorth(userId);
  revalidateAll();
  return { error: null };
}
