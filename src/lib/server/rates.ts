import type { Rates } from "@/lib/currency";

// Запасні курси (приблизні, C за 1 USD) — на випадок недоступності API.
const USD_BASED: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  UAH: 41,
};

function fallbackRates(base: string): Rates {
  const b = USD_BASED[base] ?? 1;
  const out: Rates = {};
  for (const k in USD_BASED) out[k] = USD_BASED[k] / b;
  return out;
}

/**
 * Курси base→currency. Кешується на 6 годин (Next fetch cache).
 * Джерело: open.er-api.com (без ключа). За помилки — запасні курси.
 */
export async function getRates(base: string): Promise<Rates> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      next: { revalidate: 21600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.result === "success" && data.rates) {
        return data.rates as Rates;
      }
    }
  } catch {
    // ignore — використаємо запасні
  }
  return fallbackRates(base);
}
