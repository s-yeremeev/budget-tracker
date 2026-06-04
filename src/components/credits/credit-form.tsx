"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { createCredit, updateCredit, type CreditInput } from "@/lib/actions/credits";
import { CURRENCIES } from "@/lib/constants";
import type { Credit } from "@/lib/types";

interface Props {
  credit?: Credit | null;
  defaultCurrency?: string;
  onDone: () => void;
}

export function CreditForm({ credit, defaultCurrency = "UAH", onDone }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [lender, setLender] = useState(credit?.lender ?? "");
  const [name, setName] = useState(credit?.name ?? "");
  const [total, setTotal] = useState(credit ? String(credit.total_amount) : "");
  const [remaining, setRemaining] = useState(credit ? String(credit.remaining_amount) : "");
  const [monthly, setMonthly] = useState(credit ? String(credit.monthly_payment) : "");
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

    const input: CreditInput = {
      lender: lender.trim(),
      name: name.trim(),
      total_amount: t,
      remaining_amount: Math.min(r, t),
      monthly_payment: m,
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
