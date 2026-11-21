/** Мінімум auth-клієнта Supabase, потрібний для перевірки сесії (зручно підміняти в тестах). */
export interface SessionAuth {
  getClaims(): Promise<{ data: { claims: { sub?: unknown } } | null; error: unknown }>;
  getUser(): Promise<{ data: { user: { id: string } | null } }>;
}

/**
 * Id користувача з перевіреної сесії (cookies) або null.
 *
 * `getClaims()` перевіряє підпис JWT ЛОКАЛЬНО за публічним ключем проєкту (JWKS кешується
 * на 10 хв на весь процес) — без запиту до Supabase Auth, який коштував ~95 мс на кожен
 * перехід і кожне збереження. Прострочений токен він спершу оновлює (як і `getUser()`).
 * Для симетричного ключа (HS256) `getClaims()` сам звертається до Auth.
 *
 * Не вдалося перевірити локально (JWKS недоступний, підпис не той) — фолбек на `getUser()`:
 * він питає Auth напряму. Без сесії обидва повертають «нікого» без мережі.
 *
 * Компроміс: сесія, яку завершили на іншому пристрої, лишається дійсною до кінця життя
 * токена (≤ 1 год). Так само її досі приймає і сама база (PostgREST перевіряє лише підпис).
 */
export async function verifiedUserId(auth: SessionAuth): Promise<string | null> {
  try {
    const { data, error } = await auth.getClaims();
    const sub = data?.claims?.sub;
    if (!error && typeof sub === "string" && sub) return sub;
  } catch {
    // перевіримо через getUser нижче
  }
  try {
    const { data } = await auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null; // Supabase недоступний / не налаштований — вважаємо неавторизованим
  }
}
