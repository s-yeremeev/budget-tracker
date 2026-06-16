"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useApp } from "@/components/app/app-shell";
import { createCredit, updateCredit, type CreditInput } from "@/lib/actions/credits";
import { CURRENCIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { Credit } from "@/lib/types";

interface Props {
  credit?: Credit | null;
  defaultCurrency?: string;
  onDone: () => void;
}

export function CreditForm({ credit, defaultCurrency = "UAH", onDone }: Props) {
  const router = useRouter();
  const { assets, categories } = useApp();
  const topCategories = categories.filter((c) => !c.parent_id);
  const [pending, startTransition] = useTransition();

  const [lender, setLender] = useState(credit?.lender ?? "");
  const [name, setName] = useState(credit?.name ?? "");
  const [total, setTotal] = useState(credit ? String(credit.total_amount) : "");
  const [remaining, setRemaining] = useState(credit ? String(credit.remaining_amount) : "");
  const [monthly, setMonthly] = useState(credit ? String(credit.monthly_payment) : "");
  const [paymentDay, setPaymentDay] = useState<string>(credit?.payment_day ? String(credit.payment_day) : "");
  const [autoPay, setAutoPay] = useState(credit?.auto_pay ?? false);
  const [payAssetId, setPayAssetId] = useState<string | null>(credit?.payment_asset_id ?? null);
  const [payCategoryId, setPayCategoryId] = useState<string | null>(credit?.payment_category_id ?? null);
  const [currency, setCurrency] = useState(credit?.currency ?? defaultCurrency);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!lender.trim()) return setError("Вкажіть, де кредит (банк/кредитор).");
    if (!name.trim()) return setError("Вкажіть назву кредиту.");
    const t = parseFloat(total.replace(",", ".")) || 0;
    if (t <= 0) return setError("Вкажіть загальну суму кредиту.");
    // якщо залишок не задано — дорівнює загальній сумі
    const r = remaining.trim() ? parseFloat(remaining.replace(",", ".")) || 0 : t;
    const m = parseFloat(monthly.replace(",", ".")) || 0;

    if (autoPay && !paymentDay) return setError("Для авто-списання вкажіть день платежу.");
    if (autoPay && m <= 0) return setError("Для авто-списання вкажіть щомісячну плату.");

    const input: CreditInput = {
      lender: lender.trim(),
      name: name.trim(),
      total_amount: t,
      remaining_amount: Math.min(r, t),
      monthly_payment: m,
      payment_day: paymentDay ? Number(paymentDay) : null,
      auto_pay: autoPay,
      payment_asset_id: autoPay ? payAssetId : null,
      payment_category_id: autoPay ? payCategoryId : null,
      currency,
    };
    startTransition(async () => {
      const res = credit ? await updateCredit(credit.id, input) : await createCredit(input);
      if (res.error) return setError(res.error);
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="c-lender">Де кредит</Label>
        <Input
          id="c-lender"
          autoFocus
          value={lender}
          onChange={(e) => setLender(e.target.value)}
          placeholder="Напр.: ПриватБанк, monobank, ОТП"
        />
      </div>

      <div>
        <Label htmlFor="c-name">Що за кредит</Label>
        <Input
          id="c-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Напр.: Авто, Іпотека, Розстрочка на техніку"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="c-total">Загальна сума</Label>
          <Input
            id="c-total"
            inputMode="decimal"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="c-remaining">Залишок</Label>
          <Input
            id="c-remaining"
            inputMode="decimal"
            value={remaining}
            onChange={(e) => setRemaining(e.target.value)}
            placeholder={total || "= загальній"}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="c-monthly">Щомісячна плата</Label>
          <Input
            id="c-monthly"
            inputMode="decimal"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="c-currency">Валюта</Label>
          <Select id="c-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="c-payday">День платежу (необовʼязково)</Label>
        <Select id="c-payday" value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)}>
          <option value="">— не вказувати —</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d} число</option>
          ))}
        </Select>
      </div>

      {/* Авто-списання */}
      <div className="rounded-xl border border-border bg-surface-2/50 p-3">
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={autoPay}
            onChange={(e) => setAutoPay(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          <span className="text-sm font-medium text-fg">Автоматично списувати щомісяця</span>
        </label>

        {autoPay && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-fg-subtle">
              У день платежу створюватиметься витрата на суму щомісячної плати, залишок боргу зменшуватиметься.
            </p>
            <div>
              <Label htmlFor="c-pay-asset">Списувати з активу (необовʼязково)</Label>
              <Select
                id="c-pay-asset"
                value={payAssetId ?? ""}
                onChange={(e) => setPayAssetId(e.target.value || null)}
              >
                <option value="">— не списувати з активу —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {formatCurrency(Number(a.value), a.currency)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="c-pay-cat">Категорія транзакції (необовʼязково)</Label>
              <Select
                id="c-pay-cat"
                value={payCategoryId ?? ""}
                onChange={(e) => setPayCategoryId(e.target.value || null)}
              >
                <option value="">— без категорії —</option>
                {topCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
          </div>
        )}
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
          {credit ? "Зберегти" : "Додати кредит"}
        </Button>
      </div>
    </form>
  );
}
