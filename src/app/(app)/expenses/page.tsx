import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/queries";
import { fetchAll } from "@/lib/fetch-all";
import { EXPENSE_ITEM_COLUMNS } from "@/lib/expense-refs";
import { ExpensesView } from "@/components/expenses/expenses-view";
import type { ExpenseItem } from "@/lib/types";

export default async function ExpensesPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  // Уся історія — частинами (ліміт 1000 рядків на запит) і лише потрібні поля:
  // категорії й активи вже є на клієнті (layout → useApp()), їх підставляє ExpensesView.
  const expenses = await fetchAll((from, to) =>
    supabase
      .from("expenses")
      .select(EXPENSE_ITEM_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .order("spent_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );

  return <ExpensesView expenses={expenses as unknown as ExpenseItem[]} />;
}
