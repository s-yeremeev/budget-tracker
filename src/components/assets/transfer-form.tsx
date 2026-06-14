"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useApp } from "@/components/app/app-shell";
import { transferBetweenAssets } from "@/lib/actions/assets";
import { convertBetween } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";
import type { Asset } from "@/lib/types";

export function TransferForm({ assets, onDone }: { assets: Asset[]; onDone: () => void }) {
  const router = useRouter();
  const { currency: base, rates } = useApp();
  const [pending, startTransition] = useTransition();

  const [fromId, setFromId] = useState(assets[0]?.id ?? "");
  const [toId, setToId] = useState(assets.find((a) => a.id !== assets[0]?.id)?.id ?? "");
  const [amount, setAmount] = useState("");
  const [received, setReceived] = useState("");
  const [error, setError] = useState<string | null>(null);

  const from = assets.find((a) => a.id === fromId);
  const to = assets.find((a) => a.id === toId);
  const sameCurrency = from && to && from.currency === to.currency;

  // Автообчислення отриманої суми при різних валютах
  useEffect(() => {
    if (!from || !to || sameCurrency) return;
    const num = parseFloat(amount.replace(",", ".")) || 0;
    if (num <= 0) {
      setReceived("");
      return;
    }
    const conv = convertBetween(num, from.currency, to.currency, base, rates);
    setReceived(conv.toFixed(2));
  }, [amount, fromId, toId, from, to, sameCurrency, base, rates]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!from || !to) return setError("Оберіть активи.");
    if (fromId === toId) return setError("Оберіть різні активи.");
    const amountNum = parseFloat(amount.replace(",", ".")) || 0;
    if (amountNum <= 0) return setError("Вкажіть суму більшу за нуль.");
    const receivedNum = sameCurrency ? amountNum : parseFloat(received.replace(",", ".")) || 0;
    if (receivedNum <= 0) return setError("Вкажіть отриману суму.");
    if (amountNum > Number(from.value)) return setError("На джерелі недостатньо коштів.");

    startTransition(async () => {
      const res = await transferBetweenAssets({
        from_id: fromId,
        to_id: toId,
        amount: amountNum,
        received: receivedNum,
      });
      if (res.error) return setError(res.error);
      router.refresh();
      onDone();
    });
  }

  if (assets.length < 2) {
    return (
      <p className="py-6 text-center text-sm text-fg-muted">
        Для переказу потрібно щонайменше два активи.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Звідки */}
      <div>
        <Label htmlFor="t-from">Звідки</Label>
        <Select id="t-from" value={fromId} onChange={(e) => setFromId(e.target.value)}>
          {assets.map((a) => (
            <option key={a.id} value={a.id} disabled={a.id === toId}>
              {a.name} · {formatCurrency(Number(a.value), a.currency)}
            </option>
          ))}
        </Select>
      </div>

      {/* Сума, що знімається */}
      <div>
        <Label htmlFor="t-amount">Сума {from ? `(${from.currency})` : ""}</Label>
        <Input
          id="t-amount"
          inputMode="decimal"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="text-lg font-semibold"
        />
      </div>

      <div className="flex justify-center">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
          <ArrowDown className="h-4 w-4" />
        </span>
      </div>

      {/* Куди */}
      <div>
        <Label htmlFor="t-to">Куди</Label>
        <Select id="t-to" value={toId} onChange={(e) => setToId(e.target.value)}>
          {assets.map((a) => (
            <option key={a.id} value={a.id} disabled={a.id === fromId}>
              {a.name} · {formatCurrency(Number(a.value), a.currency)}
            </option>
          ))}
        </Select>
      </div>

      {/* Отримана сума — лише при різних валютах */}
      {!sameCurrency && from && to && (
        <div>
          <Label htmlFor="t-received">Отримано ({to.currency})</Label>
          <Input
            id="t-received"
            inputMode="decimal"
            value={received}
            onChange={(e) => setReceived(e.target.value)}
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-fg-subtle">
            Розраховано за курсом — за потреби виправ під реальний курс банку.
          </p>
        </div>
      )}

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
          Перекинути
        </Button>
      </div>
    </form>
  );
}
