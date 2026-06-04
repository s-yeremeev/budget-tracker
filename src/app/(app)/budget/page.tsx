import { redirect } from "next/navigation";
import { getUserId } from "@/lib/queries";
import { BudgetView } from "@/components/budget/budget-view";

export default async function BudgetPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return <BudgetView />;
}
