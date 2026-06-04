"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Copy, Loader2, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { useApp } from "@/components/app/app-shell";
import { createClient } from "@/lib/supabase/client";
import { setBudget, copyBudgetFromPrevMonth } from "@/lib/actions/budgets";
import { formatCurrency, formatMonthUk, monthBounds, cn } from "@/lib/utils";

function periodISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

interface Row {
  spent: number;
  planned: number;
}

export function BudgetView() {
  const { categories, currency } = useApp();
  const supabase = createClient();
  const [ref, setRef] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [data, setData] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [copying, startCopy] = useTransition();

  const period = periodISO(ref);

  const load = useCallback(async () => {
    setLoading(true);
    const { start, end } = monthBounds(ref);
    const [{ data: budgets }, { data: expenses }] = await Promise.all([
      supabase.from("budgets").select("category_id, amount").eq("period", period),
      supabase
        .from("expenses")
        .select("category_id, amount")
        .gte("spent_at", start)
        .lte("spent_at", end),
    ]);

    const map: Record<string, Row> = {};
    for (const c of categories) map[c.id] = { spent: 0, planned: 0 };
    for (const b of (budgets ?? []) as { category_id: string; amount: number }[]) {
      if (map[b.category_id]) map[b.category_id].planned = Number(b.amount);
    }
    for (const e of (expenses ?? []) as { category_id: string | null; amount: number }[]) {
      if (e.category_id && map[e.category_id]) map[e.category_id].spent += Number(e.amount);
    }
    setData(map);
    setLoading(false);
  }, [supabase, period, ref, categories]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPlanned = Object.values(data).reduce((s, r) => s + r.planned, 0);
  const totalSpent = Object.values(data).reduce((s, r) => s + r.spent, 0);
  const remaining = totalPlanned - totalSpent;

  function shiftMonth(delta: number) {
    setRef((r) => new Date(r.getFullYear(), r.getMonth() + delta, 1));
  }

  function copyPrev() {
    startCopy(async () => {
      const res = await copyBudgetFromPrevMonth(period);
      if (!res.error) load();
    });
  }

  const planned = categories.filter((c) => (data[c.id]?.planned ?? 0) > 0);
  const unplanned = categories.filter((c) => (data[c.id]?.planned ?? 0) === 0);

  return (
    <div className="space-y-6">
      {/* Навігація місяцями + підсумок */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button onClick={() => shiftMonth(-1)} className="rounded-lg p-2 text-fg-muted hover:bg-surface-2" aria-label="Попередній місяць">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-40 text-center text-base font-semibold text-fg">
                {formatMonthUk(ref)}
              </span>
              <button onClick={() => shiftMonth(1)} className="rounded-lg p-2 text-fg-muted hover:bg-surface-2" aria-label="Наступний місяць">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={copyPrev} loading={copying}>
              <Copy className="h-4 w-4" /> Копіювати з минулого
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <Summary label="Заплановано" value={formatCurrency(totalPlanned, currency)} />
            <Summary label="Витрачено" value={formatCurrency(totalSpent, currency)} />
            <Summary
              label="Залишок"
              value={formatCurrency(remaining, currency)}
              tone={remaining < 0 ? "danger" : "success"}
            />
          </div>

          {totalPlanned > 0 && (
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  totalSpent > totalPlanned ? "bg-danger" : "bg-primary",
                )}
                style={{ width: `${Math.min((totalSpent / totalPlanned) * 100, 100)}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12 text-fg-subtle">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon="PiggyBank" title="Немає категорій" description="Спершу додайте категорії витрат." />
          </CardContent>
        </Card>
      ) : (
        <>
          {planned.length > 0 && (
            <div className="space-y-3">
              {planned.map((c) => (
                <BudgetRow
                  key={c.id}
                  category={c}
                  row={data[c.id]}
                  period={period}
                  currency={currency}
                  onSaved={load}
                />
              ))}
            </div>
          )}

          {unplanned.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-sm font-medium text-fg-muted">
                Без ліміту
              </p>
              <div className="space-y-3">
                {unplanned.map((c) => (
                  <BudgetRow
                    key={c.id}
                    category={c}
                    row={data[c.id]}
                    period={period}
                    currency={currency}
                    onSaved={load}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" }) {
  return (
    <div>
      <p className="text-xs text-fg-subtle">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-bold",
          tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function BudgetRow({
  category,
  row,
  period,
  currency,
  onSaved,
}: {
  category: { id: string; name: string; icon: string; color: string };
  row: Row;
  period: string;
  currency: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(row.planned ? String(row.planned) : "");
  const [pending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setValue(row.planned ? String(row.planned) : "");
  }, [row.planned]);

  const spent = row.spent;
  const planned = row.planned;
  const pct = planned > 0 ? (spent / planned) * 100 : 0;
  const over = spent > planned && planned > 0;
  const near = pct >= 80 && pct < 100;

  function save() {
    const num = parseFloat(value.replace(",", ".")) || 0;
    if (num === planned) return;
    startTransition(async () => {
      const res = await setBudget({ category_id: category.id, period, amount: num, currency });
      if (!res.error) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
        onSaved();
      }
    });
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: category.color + "22", color: category.color }}
          >
            <Icon name={category.icon} className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-fg">{category.name}</p>
              <span
                className={cn(
                  "text-sm font-semibold",
                  over ? "text-danger" : near ? "text-warning" : "text-fg-muted",
                )}
              >
                {formatCurrency(spent, currency)}
                {planned > 0 && (
                  <span className="text-fg-subtle"> / {formatCurrency(planned, currency)}</span>
                )}
              </span>
            </div>

            {planned > 0 && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    over ? "bg-danger" : near ? "bg-warning" : "bg-success",
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            )}
            {over && (
              <p className="mt-1 text-xs font-medium text-danger">
                Перевищено на {formatCurrency(spent - planned, currency)}
              </p>
            )}
          </div>

          <div className="relative w-28 shrink-0">
            <input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              placeholder="Ліміт"
              className="h-9 w-full rounded-lg border border-border bg-bg-elevated px-2.5 pr-7 text-right text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle">
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : justSaved ? <Check className="h-3.5 w-3.5 text-success" /> : null}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
