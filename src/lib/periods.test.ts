/// <reference types="vitest/globals" />
import { monthEndForecast, samePeriodPrevMonth, samePeriodPrevYear } from "@/lib/periods";

describe("samePeriodPrevMonth", () => {
  it("21 листопада → 1–21 жовтня", () => {
    expect(samePeriodPrevMonth(new Date(2026, 10, 21))).toEqual({ start: "2026-10-01", end: "2026-10-21" });
  });
  it("31 березня → весь лютий (28 днів)", () => {
    expect(samePeriodPrevMonth(new Date(2027, 2, 31))).toEqual({ start: "2027-02-01", end: "2027-02-28" });
  });
  it("перехід через рік: 15 січня → 1–15 грудня", () => {
    expect(samePeriodPrevMonth(new Date(2027, 0, 15))).toEqual({ start: "2026-12-01", end: "2026-12-15" });
  });
});

describe("samePeriodPrevYear", () => {
  it("21 листопада 2026 → 1 січня – 21 листопада 2025", () => {
    expect(samePeriodPrevYear(new Date(2026, 10, 21))).toEqual({ start: "2025-01-01", end: "2025-11-21" });
  });
  it("29 лютого → 28 лютого попереднього року", () => {
    expect(samePeriodPrevYear(new Date(2028, 1, 29))).toEqual({ start: "2027-01-01", end: "2027-02-28" });
  });
});

describe("monthEndForecast", () => {
  it("66 998 за 21 день листопада → ~95 711 на 30 днів", () => {
    expect(Math.round(monthEndForecast(66998, new Date(2026, 10, 21)))).toBe(95711);
  });
  it("останній день місяця — прогноз = факт", () => {
    expect(monthEndForecast(1000, new Date(2026, 10, 30))).toBeCloseTo(1000, 2);
  });
});
