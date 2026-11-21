/// <reference types="vitest/globals" />
import { cardDebtTotal, netWorthTotal, rescheduleNextRun, toAssetAmount } from "@/lib/money";

describe("rescheduleNextRun — редагування / ввімкнення без подвійних і зайвих списань", () => {
  const today = "2026-11-21";

  it("редагування в день платежу після списання: лишається наступний місяць (без дубля)", () => {
    // 21-го списано → курсор уже 21 грудня
    expect(rescheduleNextRun("2026-12-21", 21, today)).toBe("2026-12-21");
  });

  it("зміна дня після списання цього місяця: новий день у наступному місяці", () => {
    expect(rescheduleNextRun("2026-12-21", 5, today)).toBe("2026-12-05");
    expect(rescheduleNextRun("2026-12-21", 28, today)).toBe("2026-12-28");
  });

  it("цього місяця ще не списано і день пізніше — у цьому місяці", () => {
    expect(rescheduleNextRun("2026-11-25", 25, today)).toBe("2026-11-25");
    expect(rescheduleNextRun("2026-11-25", 28, today)).toBe("2026-11-28");
  });

  it("день сьогодні і цього місяця ще не списано — сьогодні", () => {
    expect(rescheduleNextRun("2026-11-25", 21, today)).toBe("2026-11-21");
  });

  it("день перенесли на вже минулу дату — наступний місяць, без списання «заднім числом»", () => {
    expect(rescheduleNextRun("2026-11-25", 10, today)).toBe("2026-12-10");
  });

  it("повторне ввімкнення після паузи: без нарахування пропущених місяців", () => {
    expect(rescheduleNextRun("2026-08-15", 15, today)).toBe("2026-12-15");
    expect(rescheduleNextRun("2026-08-21", 21, today)).toBe("2026-11-21"); // сьогодні — день платежу
  });

  it("без курсора — найближча дата від сьогодні", () => {
    expect(rescheduleNextRun(null, 21, today)).toBe("2026-11-21");
    expect(rescheduleNextRun(null, 20, today)).toBe("2026-12-20");
  });

  it("31-ше в коротких місяцях і перехід через рік", () => {
    expect(rescheduleNextRun(null, 31, "2026-11-30")).toBe("2026-11-30");
    expect(rescheduleNextRun(null, 31, "2027-02-10")).toBe("2027-02-28");
    expect(rescheduleNextRun("2026-11-30", 31, "2026-12-01")).toBe("2026-12-31");
    expect(rescheduleNextRun(null, 5, "2026-12-20")).toBe("2027-01-05");
  });
});

describe("toAssetAmount — сума у валюті рахунку", () => {
  // Курси з базою UAH: скільки одиниць валюти за 1 ₴
  const uahRates = { UAH: 1, USD: 1 / 40, EUR: 1 / 45 };

  it("та сама валюта — без змін", () => {
    expect(toAssetAmount(123.45, "UAH", "UAH", uahRates)).toBe(123.45);
  });

  it("10 $ з гривневого рахунку = 400 ₴, 20 € = 900 ₴", () => {
    expect(toAssetAmount(10, "USD", "UAH", uahRates)).toBe(400);
    expect(toAssetAmount(20, "EUR", "UAH", uahRates)).toBe(900);
  });

  it("округлення до копійок", () => {
    expect(toAssetAmount(1, "UAH", "USD", { USD: 1, UAH: 41.37 })).toBe(0.02);
    expect(toAssetAmount(33.333, "USD", "UAH", uahRates)).toBe(1333.32);
  });

  it("немає курсу — сума як є (не падаємо)", () => {
    expect(toAssetAmount(10, "GBP", "UAH", uahRates)).toBe(10);
  });
});

describe("netWorthTotal — капітал у базовій валюті мінус борги", () => {
  const rates = { UAH: 1, USD: 1 / 40, EUR: 1 / 45 };

  it("конвертує активи в різних валютах", () => {
    const assets = [
      { value: 35000, currency: "UAH" },
      { value: 1000, currency: "USD" },
      { value: 500, currency: "EUR" },
    ];
    expect(netWorthTotal(assets, [], "UAH", rates)).toBe(35000 + 40000 + 22500);
  });

  it("віднімає залишки кредитів (теж у базовій валюті) і враховує мінусові рахунки", () => {
    const assets = [
      { value: 10000, currency: "UAH" },
      { value: -2941, currency: "UAH" }, // кредитка в мінусі
    ];
    const credits = [
      { remaining_amount: 3000, currency: "UAH" },
      { remaining_amount: 100, currency: "USD" },
    ];
    expect(netWorthTotal(assets, credits, "UAH", rates)).toBe(10000 - 2941 - 3000 - 4000);
  });
});

describe("cardDebtTotal — мінус на картках", () => {
  it("сумує лише відʼємні баланси, у базовій валюті", () => {
    const assets = [
      { value: 849, currency: "UAH" },
      { value: -226, currency: "UAH" },
      { value: -1454, currency: "UAH" },
      { value: -10, currency: "USD" },
    ];
    expect(cardDebtTotal(assets, "UAH", { UAH: 1, USD: 1 / 40 })).toBe(226 + 1454 + 400);
  });
  it("без мінусових балансів — 0", () => {
    expect(cardDebtTotal([{ value: 100, currency: "UAH" }], "UAH", {})).toBe(0);
  });
});
