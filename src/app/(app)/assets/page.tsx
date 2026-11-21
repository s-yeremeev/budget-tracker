import { redirect } from "next/navigation";
import { getUserId, getAssetsData, getNetWorthSeries, getCreditsTotal } from "@/lib/queries";
import { getRates } from "@/lib/server/rates";
import { getProfile } from "@/lib/server/session";
import { AssetsView } from "@/components/assets/assets-view";

export default async function AssetsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const profile = await getProfile(userId); // спільний з layout запит
  const base = profile?.base_currency ?? "UAH";
  const rates = await getRates(base);

  const [{ assets, categories, total }, series, debtTotal] = await Promise.all([
    getAssetsData(userId, base, rates),
    getNetWorthSeries(userId, base),
    getCreditsTotal(userId, base, rates),
  ]);

  return (
    <AssetsView
      assets={assets}
      categories={categories}
      total={total}
      debtTotal={debtTotal}
      series={series}
    />
  );
}
