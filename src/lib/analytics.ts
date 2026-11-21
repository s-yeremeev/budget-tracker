// Чисті функції аналітики (без React) — щоб їх можна було покрити тестами.
import { FILTER_ALL, matchesCategoryFilter } from "@/lib/category-filter";

export const MONTHS_SHORT = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"];

export interface MonthDesc {
  key: string;
  y: number;
  m: number;
  label: string;
}

/** Витрата з сумою вже у базовій валюті. */
export interface ComparableExpense {
  amount: number;
  spent_at: string; // YYYY-MM-DD
  category_id: string | null;
  subcategory_id: string | null;
  category: { id: string; name: string; color: string } | null;
}

/** Останні n місяців (ascending: найстаріший → найновіший). */
export function monthsBack(n: number, now: Date = new Date()): MonthDesc[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      y: d.getFullYear(),
      m: d.getMonth(),
      label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    };
  });
}

/**
 * Будує дані порівняння за обрані місяці.
 * - `compareCat` = "all": мультилінія топ-6 категорій.
 * - конкретна категорія (або "none" — без категорії): стовпці за місяцями;
 *   `compareSub` додатково звужує до підкатегорії ("none" — без підкатегорії).
 */
export function buildComparison(
  expenses: ComparableExpense[],
  available: MonthDesc[],
  selectedKeys: Set<string>,
  compareCat: string,
  compareSub: string = FILTER_ALL,
) {
  const parse = (s: string) => new Date(s + "T00:00:00");
  const months = available.filter((m) => selectedKeys.has(m.key)); // ascending
  const empty = {
    selectedCount: 0,
    series: [] as { key: string; name: string; color: string }[],
    data: [] as Record<string, number | string>[],
    bars: [] as { label: string; amount: number }[],
    sum: 0,
    avg: 0,
    maxLabel: "",
    maxAmount: 0,
    change: null as number | null,
  };
  if (months.length === 0) return empty;

  const idxOf = (d: Date) => months.findIndex((mm) => mm.y === d.getFullYear() && mm.m === d.getMonth());

  // Значення по місяцях (для статистики)
  let values: number[];
  let series: { key: string; name: string; color: string }[] = [];
  let data: Record<string, number | string>[] = [];
  let bars: { label: string; amount: number }[] = [];

  if (compareCat === FILTER_ALL) {
    const catMeta = new Map<string, { name: string; color: string }>();
    const monthCat: Record<string, number>[] = months.map(() => ({}));
    const monthTotal = months.map(() => 0);
    for (const e of expenses) {
      const i = idxOf(parse(e.spent_at));
      if (i < 0) continue;
      const id = e.category?.id ?? "none";
      if (!catMeta.has(id))
        catMeta.set(id, { name: e.category?.name ?? "Без категорії", color: e.category?.color ?? "#64748b" });
      const amt = Number(e.amount);
      monthCat[i][id] = (monthCat[i][id] ?? 0) + amt;
      monthTotal[i] += amt;
    }
    const totals = new Map<string, number>();
    for (const md of monthCat) for (const k in md) totals.set(k, (totals.get(k) ?? 0) + md[k]);
    const topIds = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
    series = topIds.map((id) => ({ key: id, name: catMeta.get(id)!.name, color: catMeta.get(id)!.color }));
    data = months.map((mm, i) => {
      const row: Record<string, number | string> = { label: mm.label };
      for (const id of topIds) row[id] = monthCat[i][id] ?? 0;
      return row;
    });
    values = monthTotal;
  } else {
    values = months.map(() => 0);
    for (const e of expenses) {
      if (!matchesCategoryFilter(e, compareCat, compareSub)) continue;
      const i = idxOf(parse(e.spent_at));
      if (i < 0) continue;
      values[i] += Number(e.amount);
    }
    bars = months.map((mm, i) => ({ label: mm.label, amount: values[i] }));
  }

  const sum = values.reduce((s, v) => s + v, 0);
  const avg = sum / months.length;
  let maxAmount = -1;
  let maxLabel = "";
  months.forEach((mm, i) => {
    if (values[i] > maxAmount) {
      maxAmount = values[i];
      maxLabel = mm.label;
    }
  });
  const first = values[0];
  const last = values[values.length - 1];
  const change = first === 0 ? (last === 0 ? 0 : null) : ((last - first) / Math.abs(first)) * 100;

  return { selectedCount: months.length, series, data, bars, sum, avg, maxLabel, maxAmount: Math.max(maxAmount, 0), change };
}
