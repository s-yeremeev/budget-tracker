/// <reference types="vitest/globals" />
import { dailyProcessingAction } from "@/lib/daily-marker";

const TODAY = "2026-11-21";

describe("dailyProcessingAction", () => {
  it("сьогодні вже оброблено — пропускаємо", () => {
    expect(dailyProcessingAction({ auto_processed_on: TODAY }, TODAY)).toBe("skip");
  });

  it("позначки ще немає або вона вчорашня — забираємо день", () => {
    expect(dailyProcessingAction({ auto_processed_on: null }, TODAY)).toBe("claim");
    expect(dailyProcessingAction({ auto_processed_on: "2026-11-20" }, TODAY)).toBe("claim");
  });

  it("новий день після позначки — знову забираємо", () => {
    expect(dailyProcessingAction({ auto_processed_on: TODAY }, "2026-11-22")).toBe("claim");
  });

  it("колонки немає (міграцію не застосовано) — працюємо як раніше", () => {
    expect(dailyProcessingAction({}, TODAY)).toBe("legacy");
    expect(dailyProcessingAction({ display_name: "x" } as never, TODAY)).toBe("legacy");
  });

  it("профіль не прочитався — як раніше, щоб не пропустити нарахування", () => {
    expect(dailyProcessingAction(null, TODAY)).toBe("legacy");
    expect(dailyProcessingAction(undefined, TODAY)).toBe("legacy");
  });
});
