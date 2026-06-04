import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/queries";
import { GoalsView } from "@/components/goals/goals-view";
import type { GoalWithAsset } from "@/lib/types";

export default async function GoalsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*, asset:assets(value, currency)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return <GoalsView goals={(data as unknown as GoalWithAsset[]) ?? []} />;
}
