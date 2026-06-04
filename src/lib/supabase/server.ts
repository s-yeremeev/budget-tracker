import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/**
 * Supabase-клієнт для серверного коду (Server Components, Route Handlers,
 * Server Actions). У Next.js 16 `cookies()` асинхронний — тому await.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Виклик із Server Component — оновлення сесії бере на себе proxy.ts.
          }
        },
      },
    },
  );
}
