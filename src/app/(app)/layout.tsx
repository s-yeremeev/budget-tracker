import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";
import { processRecurring } from "@/lib/server/recurring";
import type { Asset, ExpenseCategory, Profile } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Ліниве авто-нарахування повторюваних витрат (до читання активів).
  try {
    await processRecurring(user.id);
  } catch {
    // не блокуємо застосунок, якщо щось пішло не так
  }

  const [{ data: profile }, { data: categories }, { data: assets }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("expense_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id)
      .order("value", { ascending: false }),
  ]);

  return (
    <AppShell
      profile={(profile as Profile) ?? null}
      categories={(categories as ExpenseCategory[]) ?? []}
      assets={(assets as Asset[]) ?? []}
    >
      {children}
    </AppShell>
  );
}
