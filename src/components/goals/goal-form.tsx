"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useApp } from "@/components/app/app-shell";
import { createGoal, updateGoal, type GoalInput } from "@/lib/actions/goals";
import { CURRENCIES, CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Goal } from "@/lib/types";

const GOAL_ICONS = [
  "Target", "PiggyBank", "Plane", "Car", "House", "GraduationCap",
  "Smartphone", "Gift", "Heart", "Briefcase", "Wallet", "TrendingUp",
];

interface Props {
  goal?: Goal | null;
  defaultCurrency?: string;
  onDone: () => void;
}

export function GoalForm({ goal, defaultCurrency = "UAH", onDone }: Props) {
  const router = useRouter();
  const { assets } = useApp();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? String(goal.target_amount) : "");
  const [current, setCurrent] = useState(goal ? String(goal.current_amount) : "");
  const [currency, setCurrency] = useState(goal?.currency ?? defaultCurrency);
  const [date, setDate] = useState(goal?.target_date ?? "");
  const [assetId, setAssetId] = useState<string | null>(goal?.asset_id ?? null);
  const [icon, setIcon] = useState(goal?.icon ?? GOAL_ICONS[0]);
  const [color, setColor] = useState(goal?.color ?? CATEGORY_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Введіть назву цілі.");
    const t = parseFloat(target.replace(",", "."));
    if (!t || t <= 0) return setError("Вкажіть цільову суму більшу за нуль.");

    const input: GoalInput = {
      name: name.trim(),
      icon,
      color,
      target_amount: t,
      current_amount: parseFloat(current.replace(",", ".")) || 0,
      asset_id: assetId,
      currency,
      target_date: date || null,
    };
    startTransition(async () => {
      const res = goal ? await updateGoal(goal.id, input) : await createGoal(input);
      if (res.error) return setError(res.error);
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="g-name">Назва цілі</Label>
        <Input
          id="g-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Напр.: Відпустка, Новий ноутбук, Резерв"
        />
      </div>

      <div>
        <Label htmlFor="g-target">Цільова сума</Label>
        <div className="flex gap-2">
          <Input
            id="g-target"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
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

      {/* Джерело прогресу */}
      {assets.length > 0 && (
        <div>
          <Label htmlFor="g-asset">Рахувати прогрес із активу (необовʼязково)</Label>
          <Select
            id="g-asset"
            value={assetId ?? ""}
            onChange={(e) => setAssetId(e.target.value || null)}
          >
            <option value="">— рахувати вручну —</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Поточна сума — лише для ручних цілей */}
      {!assetId && (
        <div>
          <Label htmlFor="g-current">Уже накопичено</Label>
          <Input
            id="g-current"
            inputMode="decimal"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="0.00"
          />
        </div>
      )}

      <div>
        <Label htmlFor="g-date">Дедлайн (необовʼязково)</Label>
        <Input id="g-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {/* Колір */}
      <div>
        <Label className="mb-1.5">Колір</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn("h-6 w-6 rounded-full transition-transform", color === c && "scale-110 ring-2 ring-offset-2 ring-offset-bg-elevated")}
              style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      {/* Іконка */}
      <div>
        <Label className="mb-1.5">Іконка</Label>
        <div className="grid grid-cols-6 gap-1.5">
          {GOAL_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className={cn(
                "flex h-9 items-center justify-center rounded-lg border transition-colors",
                icon === ic
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-fg-muted hover:text-fg",
              )}
            >
              <Icon name={ic} className="h-4 w-4" />
            </button>
          ))}
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
          {goal ? "Зберегти" : "Створити ціль"}
        </Button>
      </div>
    </form>
  );
}
