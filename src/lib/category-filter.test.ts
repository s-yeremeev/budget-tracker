/// <reference types="vitest/globals" />
import { FILTER_ALL, FILTER_NONE, matchesCategoryFilter, subcategoriesOf } from "@/lib/category-filter";

// Продукти (food) → Супермаркет (market), Ринок (bazaar); Транспорт (transport) без підкатегорій.
const categories = [
  { id: "food", parent_id: null },
  { id: "market", parent_id: "food" },
  { id: "bazaar", parent_id: "food" },
  { id: "transport", parent_id: null },
];

const e = (category_id: string | null, subcategory_id: string | null) => ({ category_id, subcategory_id });
const foodMarket = e("food", "market");
const foodBazaar = e("food", "bazaar");
const foodPlain = e("food", null);
const transport = e("transport", null);
const uncategorized = e(null, null);
const all = [foodMarket, foodBazaar, foodPlain, transport, uncategorized];

const pick = (cat: string, sub?: string) => all.filter((x) => matchesCategoryFilter(x, cat, sub));

describe("matchesCategoryFilter", () => {
  it("«Усі категорії» пропускає все", () => {
    expect(pick(FILTER_ALL)).toEqual(all);
  });

  it("«Без категорії» — лише витрати без category_id", () => {
    expect(pick(FILTER_NONE)).toEqual([uncategorized]);
  });

  it("категорія без фільтра підкатегорії — усі її витрати, з підкатегоріями й без", () => {
    expect(pick("food")).toEqual([foodMarket, foodBazaar, foodPlain]);
    expect(pick("food", FILTER_ALL)).toEqual([foodMarket, foodBazaar, foodPlain]);
  });

  it("конкретна підкатегорія — лише її витрати", () => {
    expect(pick("food", "market")).toEqual([foodMarket]);
    expect(pick("food", "bazaar")).toEqual([foodBazaar]);
  });

  it("«Без підкатегорії» — витрати категорії, у яких підкатегорію не задано", () => {
    expect(pick("food", FILTER_NONE)).toEqual([foodPlain]);
  });

  it("підкатегорія іншої категорії нічого не знаходить", () => {
    expect(pick("transport", "market")).toEqual([]);
  });

  it("фільтр підкатегорії ігнорується для «Усі» та «Без категорії»", () => {
    expect(pick(FILTER_ALL, "market")).toEqual(all);
    expect(pick(FILTER_NONE, "market")).toEqual([uncategorized]);
  });
});

describe("subcategoriesOf", () => {
  it("повертає підкатегорії обраної категорії", () => {
    expect(subcategoriesOf(categories, "food").map((c) => c.id)).toEqual(["market", "bazaar"]);
  });

  it("порожньо для категорії без підкатегорій, «Усі», «Без категорії» та невідомого id", () => {
    expect(subcategoriesOf(categories, "transport")).toEqual([]);
    expect(subcategoriesOf(categories, FILTER_ALL)).toEqual([]);
    expect(subcategoriesOf(categories, FILTER_NONE)).toEqual([]);
    expect(subcategoriesOf(categories, "missing")).toEqual([]);
  });
});
