// Суми у валюті активу для списань/зарахувань (витрати, доходи, підписки, кредити).
import { createClient } from "@/lib/supabase/server";
import { getRates } from "@/lib/server/rates";
import { toAssetAmount } from "@/lib/money";

interface Movement {
  asset_id: string | null;
  amount: number;
  currency: string;
}

/**
 * Для кожного руху — сума у валюті його активу (за поточним курсом), або null,
 * якщо актив не вказано чи не знайдено. Порядок — як у `rows`.
 */
export async function assetAmountsFor(rows: Movement[]): Promise<(number | null)[]> {
  const ids = [...new Set(rows.map((r) => r.asset_id).filter((x): x is string => !!x))];
  if (ids.length === 0) return rows.map(() => null);

  const supabase = await createClient({ fresh: true });
  const { data } = await supabase.from("assets").select("id, currency").in("id", ids);
  const currencyOf = new Map((data ?? []).map((a: { id: string; currency: string }) => [a.id, a.currency]));

  return Promise.all(
    rows.map(async (r) => {
      const assetCurrency = r.asset_id ? currencyOf.get(r.asset_id) : undefined;
      if (!assetCurrency) return null;
      if (assetCurrency === r.currency) return Number(r.amount);
      return toAssetAmount(Number(r.amount), r.currency, assetCurrency, await getRates(assetCurrency));
    }),
  );
}

/** Скільки повернути на актив при видаленні/зміні запису: збережена сума або (старі записи) сума як є. */
export function appliedAssetAmount(row: { amount: number; asset_amount?: number | null }): number {
  return row.asset_amount != null ? Number(row.asset_amount) : Number(row.amount);
}
