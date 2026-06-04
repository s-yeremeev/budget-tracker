import { redirect } from "next/navigation";
import { getUserId } from "@/lib/queries";
import { ReportView } from "@/components/reports/report-view";

export default async function ReportsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return <ReportView />;
}
