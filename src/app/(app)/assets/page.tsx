import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserId, getAssetsData, getNetWorthSeries } from "@/lib/queries";
import { getRates } from "@/lib/server/rates";
import { AssetsView } from "@/components/assets/assets-view";
import type { Profile } from "@/lib/types";

export default async function AssetsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("base_currency")
    .eq("id", userId)
    .single();
  const base = (profile as Pick<Profile, "base_currency">)?.base_currency ?? "UAH";
  const rates = await getRates(base);

  const [{ assets, categories, total }, series] = await Promise.all([
    getAssetsData(userId, base, rates),
    getNetWorthSeries(userId),
  ]);

  return (
    <AssetsView assets={assets} categories={categories} total={total} series={series} />
  );
}
