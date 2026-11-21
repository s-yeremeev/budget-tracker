import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/queries";
import { fetchAll } from "@/lib/fetch-all";
import { ANALYTICS_EXPENSE_COLUMNS } from "@/lib/expense-refs";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import type { AnalyticsExpense } from "@/lib/types";

export default async function AnalyticsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  // Уся історія — частинами (ліміт 1000 рядків на запит) і лише поля для підрахунків:
  // категорії вже є на клієнті (useApp()), їх підставляє AnalyticsView.
  const expenses = await fetchAll((from, to) =>
    supabase
      .from("expenses")
      .select(ANALYTICS_EXPENSE_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .order("spent_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );

  return <AnalyticsView expenses={expenses as unknown as AnalyticsExpense[]} />;
}
