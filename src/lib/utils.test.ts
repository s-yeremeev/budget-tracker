/// <reference types="vitest/globals" />
import { pluralUk } from "@/lib/utils";

const tx = (n: number) => `${n} ${pluralUk(n, ["транзакція", "транзакції", "транзакцій"])}`;

describe("pluralUk", () => {
  it("1, 21, 101 — однина", () => {
    expect(tx(1)).toBe("1 транзакція");
    expect(tx(21)).toBe("21 транзакція");
    expect(tx(101)).toBe("101 транзакція");
  });

  it("2–4, 22–24, 102 — «кілька»", () => {
    expect(tx(2)).toBe("2 транзакції");
    expect(tx(3)).toBe("3 транзакції");
    expect(tx(4)).toBe("4 транзакції");
    expect(tx(22)).toBe("22 транзакції");
    expect(tx(24)).toBe("24 транзакції");
    expect(tx(102)).toBe("102 транзакції");
  });

  it("0, 5–20, 25 — «багато»", () => {
    for (const n of [0, 5, 9, 10, 15, 20, 25, 100]) expect(tx(n)).toBe(`${n} транзакцій`);
  });

  it("11–14 та 111–114 — «багато», хоч закінчуються на 1–4", () => {
    for (const n of [11, 12, 13, 14, 111, 112, 114]) expect(tx(n)).toBe(`${n} транзакцій`);
  });

  it("інші слова: надходження, шаблони, цілі", () => {
    const inc = (n: number) => pluralUk(n, ["надходження", "надходження", "надходжень"]);
    const rec = (n: number) => pluralUk(n, ["активний шаблон", "активні шаблони", "активних шаблонів"]);
    const goal = (n: number) => pluralUk(n, ["ціль", "цілі", "цілей"]);
    expect([inc(1), inc(3), inc(7)]).toEqual(["надходження", "надходження", "надходжень"]);
    expect([rec(1), rec(2), rec(11)]).toEqual(["активний шаблон", "активні шаблони", "активних шаблонів"]);
    expect([goal(1), goal(4), goal(12), goal(31)]).toEqual(["ціль", "цілі", "цілей", "ціль"]);
  });
});
