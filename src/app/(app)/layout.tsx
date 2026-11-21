import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";
import { getCurrentUserId, getProfile } from "@/lib/server/session";
import { runDailyProcessing } from "@/lib/server/daily-processing";
import { getRates } from "@/lib/server/rates";
import type { Asset, ExpenseCategory } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const loadAssets = () =>
    supabase.from("assets").select("*").eq("user_id", userId).order("value", { ascending: false });

  // Профіль, категорії й активи — паралельно (профіль спільний зі сторінкою через React cache).
  const [profile, { data: categories }, assetsRes] = await Promise.all([
    getProfile(userId),
    supabase
      .from("expense_categories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    loadAssets(),
  ]);
  let assets = assetsRes.data;

  // Авто-нарахування підписок і платежів по кредитах — раз на день.
  // Якщо щось згенеровано, баланси активів змінились — перечитуємо їх.
  try {
    if (await runDailyProcessing(userId, profile)) assets = (await loadAssets()).data;
  } catch {
    // не блокуємо застосунок, якщо щось пішло не так
  }

  const rates = await getRates(profile?.base_currency ?? "UAH");

  return (
    <AppShell
      profile={profile}
      categories={(categories as ExpenseCategory[]) ?? []}
      assets={(assets as Asset[]) ?? []}
      rates={rates}
    >
      {children}
    </AppShell>
  );
}
