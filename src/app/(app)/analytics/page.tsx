import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/queries";
import { fetchAll } from "@/lib/fetch-all";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import type { ExpenseWithCategory } from "@/lib/types";

export default async function AnalyticsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  // Уся історія — частинами, щоб не впертися в ліміт 1000 рядків на запит.
  const expenses = await fetchAll((from, to) =>
    supabase
      .from("expenses")
      .select("*, category:expense_categories!expenses_category_id_fkey(*)", { count: "exact" })
      .eq("user_id", userId)
      .order("spent_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );

  return <AnalyticsView expenses={expenses as unknown as ExpenseWithCategory[]} />;
}
