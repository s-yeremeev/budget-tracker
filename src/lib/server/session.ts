// Дані поточного запиту, спільні для layout і сторінки.
// React `cache` гарантує один виклик на рендер (layout і сторінка рендеряться паралельно).
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Id поточного користувача.
 * `getClaims()` перевіряє JWT локально за публічним ключем проєкту (JWKS кешується
 * на 10 хв), тож зазвичай обходиться без запиту до Supabase Auth. Для проєктів із
 * симетричним ключем він сам звертається до Auth — як і раніше. Повну перевірку сесії
 * (та оновлення токена) і далі робить proxy на кожному запиті.
 * Якщо щось пішло не так — фолбек на `getUser()`.
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    if (!error && typeof sub === "string" && sub) return sub;
  } catch {
    // ігноруємо — перевіримо через getUser нижче
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
});

/** Профіль користувача — один запит на рендер. */
export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return (data as Profile | null) ?? null;
});
