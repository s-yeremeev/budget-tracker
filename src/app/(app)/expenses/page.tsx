import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/queries";
import { fetchAll } from "@/lib/fetch-all";
import { ExpensesView } from "@/components/expenses/expenses-view";
import type { ExpenseCategory, ExpenseWithCategory } from "@/lib/types";

export default async function ExpensesPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const [expenses, { data: categories }] = await Promise.all([
    // Уся історія — частинами, щоб не впертися в ліміт 1000 рядків на запит.
    fetchAll((from, to) =>
      supabase
        .from("expenses")
        .select("*, category:expense_categories!expenses_category_id_fkey(*), asset:assets(name, currency)", {
          count: "exact",
        })
        .eq("user_id", userId)
        .order("spent_at", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    supabase
      .from("expense_categories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <ExpensesView
      expenses={expenses as unknown as ExpenseWithCategory[]}
      categories={(categories as ExpenseCategory[]) ?? []}
    />
  );
}
