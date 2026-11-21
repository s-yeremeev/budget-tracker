// Сумісність з базою, де ще не застосовано свіжу міграцію (міграції — вручну, див. README).
import type { PostgrestError } from "@supabase/supabase-js";

/** Помилка «колонки немає» (PostgREST schema cache / Postgres). */
export function isMissingColumn(error: Pick<PostgrestError, "code"> | null | undefined): boolean {
  return !!error && (error.code === "PGRST204" || error.code === "42703");
}

/**
 * Виконує запис із новими колонками; якщо їх ще немає в БД — повторює без них.
 * Так деплой коду не ламає збереження, навіть якщо SQL-міграцію запустять пізніше.
 */
export async function withColumnFallback<T extends { error: PostgrestError | null }>(
  run: (withNewColumns: boolean) => PromiseLike<T>,
): Promise<T> {
  const res = await run(true);
  return isMissingColumn(res.error) ? run(false) : res;
}

/** Копії рядків без ключа `key` (для повтору запису без нової колонки). */
export function omitKey<T extends Record<string, unknown>>(rows: T[], key: string): Record<string, unknown>[] {
  return rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== key)));
}
