import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/queries";
import { CreditsView } from "@/components/credits/credits-view";
import type { Credit } from "@/lib/types";

export default async function CreditsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("credits")
    .select("*")
    .eq("user_id", userId)
    .order("remaining_amount", { ascending: false });

  return <CreditsView credits={(data as Credit[]) ?? []} />;
}
