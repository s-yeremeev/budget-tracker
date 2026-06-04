"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useApp } from "@/components/app/app-shell";
import { createRecurring, updateRecurring, type RecurringInput } from "@/lib/actions/recurring";
import { CURRENCIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { RecurringExpense } from "@/lib/types";

interface Props {
  recurring?: RecurringExpense | null;
  defaultCurrency?: string;
  onDone: () => void;
}

export function RecurringForm({ recurring, defaultCurrency = "UAH", onDone }: Props) {
  const router = useRouter();
  const { categories, assets } = useApp();
  const topLevel = categories.filter((c) => !c.parent_id);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(recurring?.name ?? "");
  const [amount, setAmount] = useState(recurring ? String(recurring.amount) : "");
  const [currency, setCurrency] = useState(recurring?.currency ?? defaultCurrency);
  const [categoryId, setCategoryId] = useState<string | null>(recurring?.category_id ?? topLevel[0]?.id ?? null);
  const [day, setDay] = useState(recurring?.day_of_month ?? 1);
  const [assetId, setAssetId] = useState<string | null>(recurring?.asset_id ?? null);
  const [comment, setComment] = useState(recurring?.comment ?? "");
  const [active, setActive] = useState(recurring?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Вкажіть назву (напр. Netflix, Оренда).");
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) return setError("Введіть суму більшу за нуль.");

    const input: RecurringInput = {
      name: name.trim(),
      category_id: categoryId,
      asset_id: assetId,
      amount: value,
      currency,
      day_of_month: day,
      comment: comment.trim() || null,
      active,
    };
    startTransition(async () => {
      const res = recurring ? await updateRecurring(recurring.id, input) : await createRecurring(input);
      if (res.error) return setError(res.error);
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="r-name">Назва</Label>
        <Input id="r-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр.: Netflix, Оренда, Інтернет" />
      </div>

      <div>
        <Label htmlFor="r-amount">Сума</Label>
        <div className="flex gap-2">
          <Input id="r-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="text-lg font-semibold" />
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-24">
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="r-cat">Категорія</Label>
          <Select id="r-cat" value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value || null)}>
            {topLevel.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="r-day">День місяця</Label>
          <Select id="r-day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </div>
      </div>

      {assets.length > 0 && (
        <div>
          <Label htmlFor="r-asset">Списувати з активу (необовʼязково)</Label>
          <Select id="r-asset" value={assetId ?? ""} onChange={(e) => setAssetId(e.target.value || null)}>
            <option value="">— не списувати —</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name} · {formatCurrency(Number(a.value), a.currency)}</option>)}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="r-comment">Коментар (необовʼязково)</Label>
        <Textarea id="r-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Напр.: сімейна підписка" />
      </div>

      <label className="flex items-center gap-2.5">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
        <span className="text-sm text-fg">Активна (нараховувати автоматично)</span>
      </label>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onDone}>Скасувати</Button>
        <Button type="submit" className="flex-1" loading={pending}>{recurring ? "Зберегти" : "Додати"}</Button>
      </div>
    </form>
  );
}
