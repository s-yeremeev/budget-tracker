"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useApp } from "@/components/app/app-shell";
import { createIncome, updateIncome, type IncomeInput } from "@/lib/actions/incomes";
import { CURRENCIES } from "@/lib/constants";
import { toISODate, formatCurrency } from "@/lib/utils";
import type { Income } from "@/lib/types";

const SOURCES = ["Зарплата", "Аванс", "Фріланс", "Премія", "Подарунок", "Повернення", "Відсотки", "Оренда", "Інше"];

interface Props {
  income?: Income | null;
  defaultCurrency?: string;
  onDone: () => void;
}

export function IncomeForm({ income, defaultCurrency = "UAH", onDone }: Props) {
  const router = useRouter();
  const { assets } = useApp();
  const [pending, startTransition] = useTransition();

  const [amount, setAmount] = useState(income ? String(income.amount) : "");
  const [source, setSource] = useState(income?.source ?? "");
  const [currency, setCurrency] = useState(income?.currency ?? defaultCurrency);
  const [date, setDate] = useState(income?.received_at ?? toISODate(new Date()));
  const [comment, setComment] = useState(income?.comment ?? "");
  const [assetId, setAssetId] = useState<string | null>(income?.asset_id ?? null);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) return setError("Введіть суму більшу за нуль.");
    if (!source.trim()) return setError("Вкажіть джерело доходу.");

    const input: IncomeInput = {
      source: source.trim(),
      amount: value,
      currency,
      received_at: date,
      comment: comment.trim() || null,
      asset_id: assetId,
    };
    startTransition(async () => {
      const res = income ? await updateIncome(income.id, input) : await createIncome(input);
      if (res.error) return setError(res.error);
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="i-amount">Сума</Label>
        <div className="flex gap-2">
          <Input
            id="i-amount"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="text-lg font-semibold"
          />
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-24">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="i-source">Джерело</Label>
        <Input
          id="i-source"
          list="income-sources"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Напр.: Зарплата, Фріланс"
        />
        <datalist id="income-sources">
          {SOURCES.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>

      {assets.length > 0 && (
        <div>
          <Label htmlFor="i-asset">Зарахувати на актив (необовʼязково)</Label>
          <Select
            id="i-asset"
            value={assetId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              setAssetId(id);
              const a = assets.find((x) => x.id === id);
              if (a) setCurrency(a.currency);
            }}
          >
            <option value="">— не зараховувати —</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {formatCurrency(Number(a.value), a.currency)}
              </option>
            ))}
          </Select>
          {assetId && <p className="mt-1 text-xs text-fg-subtle">Баланс активу збільшиться на суму доходу.</p>}
        </div>
      )}

      <div>
        <Label htmlFor="i-date">Дата</Label>
        <Input id="i-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="i-comment">Коментар (необовʼязково)</Label>
        <Textarea id="i-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Напр.: зарплата за червень" />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onDone}>Скасувати</Button>
        <Button type="submit" className="flex-1" loading={pending}>
          {income ? "Зберегти" : "Додати дохід"}
        </Button>
      </div>
    </form>
  );
}
