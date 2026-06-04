"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { createAsset, updateAsset, type AssetInput } from "@/lib/actions/assets";
import { CURRENCIES } from "@/lib/constants";
import type { Asset, AssetCategory } from "@/lib/types";

interface Props {
  categories: AssetCategory[];
  asset?: Asset | null;
  defaultCategoryId?: string | null;
  defaultCurrency?: string;
  onDone: () => void;
}

export function AssetForm({
  categories,
  asset,
  defaultCategoryId,
  defaultCurrency = "UAH",
  onDone,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(asset?.name ?? "");
  const [value, setValue] = useState(asset ? String(asset.value) : "");
  const [currency, setCurrency] = useState(asset?.currency ?? defaultCurrency);
  const [categoryId, setCategoryId] = useState<string | null>(
    asset?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Введіть назву активу.");
      return;
    }
    const num = parseFloat(value.replace(",", "."));
    if (isNaN(num)) {
      setError("Введіть коректну суму.");
      return;
    }
    const input: AssetInput = {
      category_id: categoryId,
      name: name.trim(),
      value: num,
      currency,
    };
    startTransition(async () => {
      const res = asset ? await updateAsset(asset.id, input) : await createAsset(input);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="a-name">Назва</Label>
        <Input
          id="a-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Напр.: Monobank, ETF VOO, Готівка"
        />
      </div>

      <div>
        <Label htmlFor="a-value">Вартість</Label>
        <div className="flex gap-2">
          <Input
            id="a-value"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            className="text-lg font-semibold"
          />
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-24">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="a-cat">Категорія</Label>
        <Select
          id="a-cat"
          value={categoryId ?? ""}
          onChange={(e) => setCategoryId(e.target.value || null)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onDone}>
          Скасувати
        </Button>
        <Button type="submit" className="flex-1" loading={pending}>
          {asset ? "Зберегти" : "Додати актив"}
        </Button>
      </div>
    </form>
  );
}
