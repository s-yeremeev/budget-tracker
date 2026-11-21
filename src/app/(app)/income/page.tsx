import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/queries";
import { fetchAll } from "@/lib/fetch-all";
import { IncomeView } from "@/components/income/income-view";
import type { IncomeWithAsset } from "@/lib/types";

export default async function IncomePage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  // Уся історія — частинами, щоб не впертися в ліміт 1000 рядків на запит.
  const incomes = await fetchAll((from, to) =>
    supabase
      .from("incomes")
      .select("*, asset:assets(name, currency)", { count: "exact" })
      .eq("user_id", userId)
      .order("received_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );

  return <IncomeView incomes={incomes as unknown as IncomeWithAsset[]} />;
}
