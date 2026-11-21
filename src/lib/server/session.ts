// Дані поточного запиту, спільні для layout і сторінки.
// React `cache` гарантує один виклик на рендер (layout і сторінка рендеряться паралельно).
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { verifiedUserId } from "@/lib/supabase/claims";
import type { Profile } from "@/lib/types";

/**
 * Id поточного користувача — локальна перевірка JWT (див. `verifiedUserId`).
 * Оновлення токена в cookies бере на себе proxy, що виконується перед рендером.
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  return verifiedUserId(supabase.auth);
});

/** Профіль користувача — один запит на рендер. */
export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return (data as Profile | null) ?? null;
});
