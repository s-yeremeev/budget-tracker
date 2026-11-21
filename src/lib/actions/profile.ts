"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { verifiedUserId } from "@/lib/supabase/claims";

export async function updateProfile(input: {
  display_name: string;
  base_currency: string;
}) {
  const supabase = await createClient();
  const userId = await verifiedUserId(supabase.auth);
  if (!userId) return { error: "Не авторизовано" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: input.display_name, base_currency: input.base_currency })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateDashboardPrefs(prefs: Record<string, boolean>) {
  const supabase = await createClient();
  const userId = await verifiedUserId(supabase.auth);
  if (!userId) return { error: "Не авторизовано" };
  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_prefs: prefs })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}
