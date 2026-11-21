// Завантаження ВСІХ рядків частинами (працює і на сервері, і в браузері).
// Supabase (PostgREST) за один запит віддає щонайбільше `max_rows` рядків (типово 1000)
// і мовчки обрізає решту — без цього найстаріші записи зникали б зі списків, аналітики,
// звітів і CSV, щойно їх стане більше за ліміт.

export const PAGE_SIZE = 1000;
const MAX_PAGES = 200; // запобіжник: до 200 тис. рядків

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
};

/**
 * `page(from, to)` має повертати запит з `.range(from, to)`, СТАБІЛЬНИМ порядком
 * (останнім — унікальне поле, напр. `.order("id")`) і бажано `select(..., { count: "exact" })`.
 * Перша сторінка дає загальну кількість, решта вантажиться паралельно. Фактичний розмір
 * сторінки береться з відповіді, тож працює й тоді, коли `max_rows` у проєкті менший за 1000.
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const first = await page(0, pageSize - 1);
  if (first.error) console.error("fetchAll:", first.error.message);
  const rows: T[] = [...(first.data ?? [])];
  const perPage = rows.length; // реальний ліміт сервера
  if (first.error || perPage === 0) return rows;

  const total = first.count;
  if (typeof total === "number") {
    const starts: number[] = [];
    for (let from = perPage; from < total && starts.length < MAX_PAGES; from += perPage) starts.push(from);
    const pages = await Promise.all(starts.map((from) => page(from, from + perPage - 1)));
    for (const p of pages) {
      if (p.error) {
        console.error("fetchAll:", p.error.message);
        break;
      }
      rows.push(...(p.data ?? []));
    }
    return rows;
  }

  // Без count — послідовно, поки сторінка повна.
  for (let i = 1, from = perPage; i < MAX_PAGES; i++, from += perPage) {
    const p = await page(from, from + perPage - 1);
    if (p.error) {
      console.error("fetchAll:", p.error.message);
      break;
    }
    rows.push(...(p.data ?? []));
    if ((p.data?.length ?? 0) < perPage) break;
  }
  return rows;
}
