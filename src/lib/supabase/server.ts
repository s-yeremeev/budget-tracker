import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/**
 * `fetch` без мемоізації Next: під час рендера Next запамʼятовує однакові GET-запити
 * і повертає першу відповідь. Для коду, що пише в базу і перечитує змінене
 * (баланси активів, Net Worth, авто-нарахування), це давало застарілі дані.
 * Власний AbortSignal — офіційний спосіб вимкнути мемоізацію (див. docs: fetch → Memoization).
 */
const freshFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? new AbortController().signal });

/**
 * Supabase-клієнт для серверного коду (Server Components, Route Handlers,
 * Server Actions). У Next.js 16 `cookies()` асинхронний — тому await.
 * `fresh: true` — без мемоізації запитів у межах рендера (для read-modify-write).
 */
export async function createClient({ fresh = false }: { fresh?: boolean } = {}) {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      ...(fresh ? { global: { fetch: freshFetch } } : {}),
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
