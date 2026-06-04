import { redirect } from "next/navigation";
import { getUserId, getAssetsData, getNetWorthSeries } from "@/lib/queries";
import { AssetsView } from "@/components/assets/assets-view";

export default async function AssetsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const [{ assets, categories, total }, series] = await Promise.all([
    getAssetsData(userId),
    getNetWorthSeries(userId),
  ]);

  return (
    <AssetsView assets={assets} categories={categories} total={total} series={series} />
  );
}
