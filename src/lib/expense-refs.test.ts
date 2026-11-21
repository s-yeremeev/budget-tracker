/// <reference types="vitest/globals" />
import { withRefs } from "@/lib/expense-refs";
import type { ExpenseCategory } from "@/lib/types";

const cat = (id: string, name: string, parent_id: string | null = null): ExpenseCategory =>
  ({ id, name, parent_id, icon: "Tag", color: "#64748b", user_id: "u", created_at: "" }) as ExpenseCategory;

describe("withRefs — категорія й актив за id", () => {
  const categories = [cat("food", "Продукти"), cat("super", "Супермаркет", "food")];
  const assets = [{ id: "mono", name: "Моно", currency: "UAH", value: 100 }];

  it("підставляє категорію (верхню, не підкатегорію) і актив {name, currency}", () => {
    const [r] = withRefs([{ id: "e1", category_id: "food", subcategory_id: "super", asset_id: "mono" }], categories, assets);
    expect(r.category?.name).toBe("Продукти");
    expect(r.asset).toEqual({ name: "Моно", currency: "UAH" });
    expect(r.subcategory_id).toBe("super");
  });

  it("без категорії / без активу / невідомий id → null", () => {
    const rows = withRefs(
      [
        { category_id: null, asset_id: null },
        { category_id: "deleted", asset_id: "gone" },
        { category_id: "food" }, // аналітика: без asset_id
      ],
      categories,
      assets,
    );
    expect(rows.map((r) => [r.category?.id ?? null, r.asset])).toEqual([
      [null, null],
      [null, null],
      ["food", null],
    ]);
  });

  it("зберігає порядок і решту полів", () => {
    const input = [
      { id: "b", category_id: "food", amount: 2, spent_at: "2026-11-02" },
      { id: "a", category_id: "food", amount: 1, spent_at: "2026-11-01" },
    ];
    const out = withRefs(input, categories);
    expect(out.map((r) => [r.id, r.amount, r.spent_at])).toEqual([
      ["b", 2, "2026-11-02"],
      ["a", 1, "2026-11-01"],
    ]);
  });
});
