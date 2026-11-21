/// <reference types="vitest/globals" />
import { fetchAll } from "@/lib/fetch-all";

/** Імітація PostgREST: max_rows обрізає відповідь, count — загальна кількість. */
function fakeTable(total: number, maxRows: number, withCount = true) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls: [number, number][] = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    const end = Math.min(to + 1, from + maxRows, total);
    return { data: rows.slice(from, end), error: null, count: withCount ? total : null };
  };
  return { page, calls };
}

describe("fetchAll — усі рядки попри ліміт сервера", () => {
  it("2 350 рядків при max_rows=1000 → усі, без дублів, по порядку", async () => {
    const t = fakeTable(2350, 1000);
    const res = await fetchAll(t.page);
    expect(res).toHaveLength(2350);
    expect(res.map((r) => r.id)).toEqual(Array.from({ length: 2350 }, (_, i) => i));
    expect(t.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("менше за сторінку — один запит", async () => {
    const t = fakeTable(549, 1000);
    expect(await fetchAll(t.page)).toHaveLength(549);
    expect(t.calls).toHaveLength(1);
  });

  it("max_rows у проєкті менший (500) — підлаштовується під фактичний розмір сторінки", async () => {
    const t = fakeTable(1700, 500);
    const res = await fetchAll(t.page);
    expect(res).toHaveLength(1700);
    expect(new Set(res.map((r) => r.id)).size).toBe(1700);
  });

  it("без count — послідовно до неповної сторінки", async () => {
    const t = fakeTable(2100, 1000, false);
    expect(await fetchAll(t.page)).toHaveLength(2100);
  });

  it("порожня таблиця і помилка — не падає", async () => {
    expect(await fetchAll(fakeTable(0, 1000).page)).toEqual([]);
    const failing = async () => ({ data: null, error: { message: "boom" }, count: null });
    expect(await fetchAll(failing)).toEqual([]);
  });
});
