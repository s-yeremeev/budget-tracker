import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/queries";
import { RecurringView } from "@/components/recurring/recurring-view";
import type { RecurringExpense } from "@/lib/types";

export default async function RecurringPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("user_id", userId)
    .order("active", { ascending: false })
    .order("day_of_month", { ascending: true });

  return <RecurringView items={(data as RecurringExpense[]) ?? []} />;
}
