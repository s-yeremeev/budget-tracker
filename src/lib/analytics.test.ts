/// <reference types="vitest/globals" />
import { buildComparison, monthsBack, type ComparableExpense } from "@/lib/analytics";
import { FILTER_ALL, FILTER_NONE } from "@/lib/category-filter";

const food = { id: "food", name: "Продукти", color: "#22c55e" };
const transport = { id: "transport", name: "Транспорт", color: "#3b82f6" };

const exp = (
  spent_at: string,
  amount: number,
  category: typeof food | null,
  subcategory_id: string | null = null,
): ComparableExpense => ({ spent_at, amount, category, category_id: category?.id ?? null, subcategory_id });

// Три місяці: лис 2025, гру 2025, січ 2026
const months = monthsBack(3, new Date(2026, 0, 15));
const allKeys = new Set(months.map((m) => m.key));

const expenses: ComparableExpense[] = [
  exp("2025-11-03", 100, food, "market"),
  exp("2025-11-20", 50, food, "bazaar"),
  exp("2025-11-21", 30, food),
  exp("2025-12-05", 200, food, "market"),
  exp("2025-12-06", 70, transport),
  exp("2026-01-10", 400, food, "market"),
  exp("2026-01-11", 10, food),
  exp("2026-01-12", 5, null),
  exp("2025-10-31", 999, food, "market"), // поза обраними місяцями
];

describe("monthsBack", () => {
  it("повертає n місяців від найстарішого до поточного, з переходом через рік", () => {
    expect(months.map((m) => m.key)).toEqual(["2025-11", "2025-12", "2026-01"]);
    expect(months.map((m) => m.label)).toEqual(["Лис 25", "Гру 25", "Січ 26"]);
  });
});

describe("buildComparison", () => {
  it("підкатегорія — суми лише її витрат по місяцях", () => {
    const r = buildComparison(expenses, months, allKeys, "food", "market");
    expect(r.bars.map((b) => b.amount)).toEqual([100, 200, 400]);
    expect(r.sum).toBe(700);
    expect(r.maxLabel).toBe("Січ 26");
    expect(r.change).toBe(300); // 100 → 400
  });

  it("«Без підкатегорії» — витрати категорії без підкатегорії", () => {
    const r = buildComparison(expenses, months, allKeys, "food", FILTER_NONE);
    expect(r.bars.map((b) => b.amount)).toEqual([30, 0, 10]);
  });

  it("категорія з «Усі підкатегорії» — як раніше, уся категорія", () => {
    const withAll = buildComparison(expenses, months, allKeys, "food", FILTER_ALL);
    const withoutSubArg = buildComparison(expenses, months, allKeys, "food");
    expect(withAll.bars.map((b) => b.amount)).toEqual([180, 200, 410]);
    expect(withoutSubArg.bars).toEqual(withAll.bars);
  });

  it("«Без категорії» працює як раніше", () => {
    const r = buildComparison(expenses, months, allKeys, FILTER_NONE);
    expect(r.bars.map((b) => b.amount)).toEqual([0, 0, 5]);
  });

  it("«Усі категорії» — мультилінія за категоріями, загальні суми не змінились", () => {
    const r = buildComparison(expenses, months, allKeys, FILTER_ALL);
    expect(r.series.map((s) => s.key)).toEqual(["food", "transport", "none"]);
    expect(r.data).toEqual([
      { label: "Лис 25", food: 180, transport: 0, none: 0 },
      { label: "Гру 25", food: 200, transport: 70, none: 0 },
      { label: "Січ 26", food: 410, transport: 0, none: 5 },
    ]);
    expect(r.sum).toBe(865);
  });

  it("враховує лише обрані місяці", () => {
    const r = buildComparison(expenses, months, new Set(["2025-12"]), "food", "market");
    expect(r.selectedCount).toBe(1);
    expect(r.bars).toEqual([{ label: "Гру 25", amount: 200 }]);
  });

  it("без обраних місяців повертає порожній результат", () => {
    expect(buildComparison(expenses, months, new Set(), "food", "market").selectedCount).toBe(0);
  });
});
