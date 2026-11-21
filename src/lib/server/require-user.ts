import { createClient } from "@/lib/supabase/server";
import { verifiedUserId } from "@/lib/supabase/claims";

/**
 * Supabase-клієнт і id поточного користувача для server actions.
 * Без сесії — помилка «Не авторизовано». Перевірка — див. `verifiedUserId`.
 */
export async function requireUser() {
  const supabase = await createClient();
  const userId = await verifiedUserId(supabase.auth);
  if (!userId) throw new Error("Не авторизовано");
  return { supabase, userId };
}
