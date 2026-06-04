"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(input: {
  display_name: string;
  base_currency: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизовано" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: input.display_name, base_currency: input.base_currency })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateDashboardPrefs(prefs: Record<string, boolean>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизовано" };
  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_prefs: prefs })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}
