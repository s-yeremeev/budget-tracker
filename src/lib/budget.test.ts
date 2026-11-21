/// <reference types="vitest/globals" />
import { computeBudget, plannedTotal, summarizeMonthBudget } from "@/lib/budget";

// Продукти (food) → Супермаркет (market), Ринок (bazaar); Транспорт (transport).
const categories = [
  { id: "food", parent_id: null },
  { id: "market", parent_id: "food" },
  { id: "bazaar", parent_id: "food" },
  { id: "transport", parent_id: null },
];

const identity = (amount: number) => amount;
const b = (category_id: string, amount: number, currency = "UAH") => ({ category_id, amount, currency });
const e = (category_id: string | null, subcategory_id: string | null, amount: number, currency = "UAH") => ({
  category_id,
  subcategory_id,
  amount,
  currency,
});

describe("computeBudget — витрачено", () => {
  const expenses = [
    e("food", "market", 300),
    e("food", "market", 200),
    e("food", "bazaar", 100),
    e("food", null, 50),
    e("transport", null, 70),
  ];
  const { rows, totalSpent } = computeBudget(categories, [], expenses, identity);

  it("підкатегорія отримує суму своїх витрат", () => {
    expect(rows.market.spent).toBe(500);
    expect(rows.bazaar.spent).toBe(100);
  });

  it("категорія включає витрати всіх своїх підкатегорій", () => {
    expect(rows.food.spent).toBe(650);
    expect(rows.transport.spent).toBe(70);
  });

  it("загальна сума рахує кожну витрату один раз", () => {
    expect(totalSpent).toBe(720); // усі мають категорію
  });

  it("витрати без категорії — лише в загальну суму (поза бюджетом), не в рядки; невідому підкатегорію ігнорує", () => {
    const r = computeBudget(
      categories,
      [],
      [e(null, null, 10), e("deleted", null, 20), e("food", "deleted-sub", 40)],
      identity,
    );
    expect(r.totalSpent).toBe(70);
    expect(r.spentOutOfBudget).toBe(70);
    expect(r.rows.food.spent).toBe(40);
    expect(r.rows.market.spent).toBe(0);
  });

  it("конвертує суми у базову валюту", () => {
    const toBase = (amount: number, currency: string) => (currency === "USD" ? amount * 40 : amount);
    const r = computeBudget(categories, [b("market", 50, "USD")], [e("food", "market", 10, "USD")], toBase);
    expect(r.rows.market.spent).toBe(400);
    expect(r.rows.market.planned).toBe(2000);
    expect(r.rows.food.spent).toBe(400);
  });
});

describe("computeBudget — заплановано", () => {
  it("ліміт підкатегорії відображається у її рядку", () => {
    const { rows } = computeBudget(categories, [b("market", 1000)], [], identity);
    expect(rows.market.planned).toBe(1000);
    expect(rows.food.planned).toBe(0);
  });

  it("ігнорує ліміти для невідомих категорій", () => {
    const r = computeBudget(categories, [b("deleted", 999)], [], identity);
    expect(r.totalPlanned).toBe(0);
  });

  it("загальний план не подвоює ліміти підкатегорій, якщо в категорії є власний ліміт", () => {
    const r = computeBudget(categories, [b("food", 5000), b("market", 3000), b("transport", 1000)], [], identity);
    expect(r.totalPlanned).toBe(6000);
  });
});

describe("plannedTotal", () => {
  const item = (categoryId: string, parentId: string | null, amount: number) => ({ categoryId, parentId, amount });

  it("сумує ліміти верхніх категорій", () => {
    expect(plannedTotal([item("food", null, 5000), item("transport", null, 1000)])).toBe(6000);
  });

  it("лише ліміти підкатегорій — сумуються", () => {
    expect(plannedTotal([item("market", "food", 3000), item("bazaar", "food", 1500)])).toBe(4500);
  });

  it("ліміт категорії охоплює її підкатегорії", () => {
    expect(
      plannedTotal([item("food", null, 5000), item("market", "food", 3000), item("bazaar", "food", 1500)]),
    ).toBe(5000);
  });

  it("ліміт категорії 0 = не задано, тоді рахуються підкатегорії", () => {
    expect(plannedTotal([item("food", null, 0), item("market", "food", 3000)])).toBe(3000);
  });

  it("підкатегорії іншої категорії не поглинаються", () => {
    expect(
      plannedTotal([item("food", null, 5000), item("market", "food", 3000), item("taxi", "transport", 800)]),
    ).toBe(5800);
  });

  it("порожній список — 0", () => {
    expect(plannedTotal([])).toBe(0);
  });
});

describe("бюджет у межах лімітів (spentInBudget / spentOutOfBudget)", () => {
  const exp = [
    e("food", "market", 300),
    e("food", "bazaar", 100),
    e("food", null, 50),
    e("transport", null, 70),
  ];

  it("ліміт лише на підкатегорії: у бюджеті тільки її витрати, решта — поза", () => {
    // як у реальних даних: ліміт лише на «Транспорт › Бензин»
    const r = computeBudget(categories, [b("market", 1000)], exp, identity);
    expect(r.spentInBudget).toBe(300);
    expect(r.spentOutOfBudget).toBe(220);
    expect(r.totalSpent).toBe(520);
    expect(r.totalPlanned).toBe(1000);
  });

  it("ліміт категорії охоплює всі її витрати, разом із підкатегоріями", () => {
    const r = computeBudget(categories, [b("food", 2000)], exp, identity);
    expect(r.spentInBudget).toBe(450);
    expect(r.spentOutOfBudget).toBe(70);
  });

  it("без лімітів — усе поза бюджетом", () => {
    const r = computeBudget(categories, [], exp, identity);
    expect(r.spentInBudget).toBe(0);
    expect(r.spentOutOfBudget).toBe(520);
  });
});

describe("summarizeMonthBudget (дашборд)", () => {
  it("рахує план і витрати в межах лімітів без списку категорій", () => {
    const s = summarizeMonthBudget(
      [
        { categoryId: "market", parentId: "food", amount: 1000 },
        { categoryId: "transport", parentId: null, amount: 500 },
      ],
      [
        { category_id: "food", subcategory_id: "market", amount: 300 },
        { category_id: "food", subcategory_id: null, amount: 50 },
        { category_id: "transport", subcategory_id: "taxi", amount: 70 },
        { category_id: null, subcategory_id: null, amount: 5 },
      ],
    );
    expect(s).toEqual({ planned: 1500, spentInBudget: 370, spentOutOfBudget: 55 });
  });
});
