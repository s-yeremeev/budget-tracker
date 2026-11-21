"use client";

import { useApp } from "@/components/app/app-shell";
import { convertBetween } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";

/**
 * Підказка у формі: якщо валюта запису відрізняється від валюти рахунку —
 * скільки приблизно спишеться/зарахується у валюті рахунку (за поточним курсом).
 * Точну суму рахує сервер за курсом на момент збереження і зберігає в записі.
 */
export function AssetConversionHint({
  amount,
  currency,
  assetId,
  verb,
}: {
  amount: string;
  currency: string;
  assetId: string | null;
  verb: "Спишеться" | "Зарахується";
}) {
  const { assets, currency: base, rates } = useApp();
  const asset = assets.find((a) => a.id === assetId);
  if (!asset || asset.currency === currency) return null;

  const value = parseFloat(amount.replace(",", "."));
  if (!value || value <= 0) {
    return (
      <p className="mt-1 text-xs text-warning">
        Валюта відрізняється від валюти рахунку ({asset.currency}) — суму буде переведено за курсом.
      </p>
    );
  }
  const converted = convertBetween(value, currency, asset.currency, base, rates);
  return (
    <p className="mt-1 text-xs text-warning">
      {verb} ≈ {formatCurrency(converted, asset.currency)} ({asset.name}, за поточним курсом).
    </p>
  );
}
