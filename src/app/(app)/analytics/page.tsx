import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/queries";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import type { ExpenseWithCategory } from "@/lib/types";

export default async function AnalyticsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("*, category:expense_categories(*)")
    .eq("user_id", userId)
    .order("spent_at", { ascending: false });

  return <AnalyticsView expenses={(data as unknown as ExpenseWithCategory[]) ?? []} />;
}
