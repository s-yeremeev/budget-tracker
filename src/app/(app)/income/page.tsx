import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/queries";
import { IncomeView } from "@/components/income/income-view";
import type { IncomeWithAsset } from "@/lib/types";

export default async function IncomePage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("incomes")
    .select("*, asset:assets(name, currency)")
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .order("created_at", { ascending: false });

  return <IncomeView incomes={(data as unknown as IncomeWithAsset[]) ?? []} />;
}
