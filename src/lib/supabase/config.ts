// Єдине місце читання Supabase-конфігу.
// Якщо env-змінні не задані, використовуємо валідні плейсхолдери —
// застосунок збереться та запуститься, але запити до Supabase
// не працюватимуть, доки не вкажете реальні значення у .env.local.

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "public-anon-key-placeholder";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
