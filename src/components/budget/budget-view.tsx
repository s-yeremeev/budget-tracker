"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Copy, Loader2, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { useApp } from "@/components/app/app-shell";
import { createClient } from "@/lib/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { setBudget, copyBudgetFromPrevMonth } from "@/lib/actions/budgets";
import { convert } from "@/lib/currency";
import { computeBudget, type BudgetRow as Row } from "@/lib/budget";
import { formatCurrency, formatMonthUk, monthBounds, cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/types";

const EMPTY_ROW: Row = { spent: 0, planned: 0 };

function periodISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function BudgetView() {
  const { categories, currency, rates } = useApp();
  const supabase = createClient();
  const [ref, setRef] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [data, setData] = useState<Record<string, Row>>({});
  const [totals, setTotals] = useState({ planned: 0, spent: 0, inBudget: 0, outOfBudget: 0 });
  const [loading, setLoading] = useState(true);
  const [copying, startCopy] = useTransition();

  const period = periodISO(ref);

  const load = useCallback(async () => {
    setLoading(true);
    const { start, end } = monthBounds(ref);
    const [{ data: budgets }, expenses] = await Promise.all([
      supabase.from("budgets").select("category_id, amount, currency").eq("period", period),
      fetchAll((from, to) =>
        supabase
          .from("expenses")
          .select("category_id, subcategory_id, amount, currency", { count: "exact" })
          .gte("spent_at", start)
          .lte("spent_at", end)
          .order("id")
          .range(from, to),
      ),
    ]);

    const summary = computeBudget(
      categories,
      (budgets ?? []) as { category_id: string; amount: number; currency: string }[],
      expenses as { category_id: string | null; subcategory_id: string | null; amount: number; currency: string }[],
      (amount, cur) => convert(amount, cur, currency, rates),
    );
    setData(summary.rows);
    setTotals({
      planned: summary.totalPlanned,
      spent: summary.totalSpent,
      inBudget: summary.spentInBudget,
      outOfBudget: summary.spentOutOfBudget,
    });
    setLoading(false);
  }, [supabase, period, ref, categories, currency, rates]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPlanned = totals.planned;
  const hasPlan = totalPlanned > 0;
  // З планом: порівнюємо лише витрати в категоріях з лімітом, решта — «поза бюджетом».
  // Без плану: просто всі витрати місяця, залишку немає.
  const totalSpent = hasPlan ? totals.inBudget : totals.spent;
  const remaining = totalPlanned - totalSpent;

  // Порядок: категорія, одразу за нею — її підкатегорії.
  const ordered = useMemo(() => {
    const out: { cat: ExpenseCategory; parent: ExpenseCategory | null }[] = [];
    for (const top of categories.filter((c) => !c.parent_id)) {
      out.push({ cat: top, parent: null });
      for (const sub of categories.filter((c) => c.parent_id === top.id)) out.push({ cat: sub, parent: top });
    }
    return out;
  }, [categories]);

  function shiftMonth(delta: number) {
    setRef((r) => new Date(r.getFullYear(), r.getMonth() + delta, 1));
  }

  function copyPrev() {
    startCopy(async () => {
      const res = await copyBudgetFromPrevMonth(period);
      if (!res.error) load();
    });
  }

  const planned = ordered.filter(({ cat }) => (data[cat.id]?.planned ?? 0) > 0);
  const unplanned = ordered.filter(({ cat }) => (data[cat.id]?.planned ?? 0) === 0);

  return (
    <div className="space-y-6">
      {/* Навігація місяцями + підсумок */}
      <Card>
        <CardContent>
          {/* На вузьких екранах кнопка копіювання переноситься на окремий рядок */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
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
            <Button variant="outline" size="sm" onClick={copyPrev} loading={copying} className="ml-auto whitespace-nowrap">
              <Copy className="h-4 w-4" /> Копіювати з минулого
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <Summary label="Заплановано" value={formatCurrency(totalPlanned, currency)} />
            <Summary label={hasPlan ? "Витрачено в межах плану" : "Витрачено"} value={formatCurrency(totalSpent, currency)} />
            <Summary
              label="Залишок"
              value={hasPlan ? formatCurrency(remaining, currency) : "—"}
              tone={hasPlan ? (remaining < 0 ? "danger" : "success") : undefined}
            />
          </div>

          {hasPlan && totals.outOfBudget > 0 && (
            <p className="mt-3 text-xs text-fg-subtle">
              Поза бюджетом (категорії без ліміту):{" "}
              <span className="font-medium text-fg-muted">{formatCurrency(totals.outOfBudget, currency)}</span>
            </p>
          )}

          {hasPlan && (
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
              {planned.map(({ cat, parent }) => (
                <BudgetRow
                  key={cat.id}
                  category={cat}
                  parentName={parent?.name}
                  row={data[cat.id] ?? EMPTY_ROW}
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
                {unplanned.map(({ cat, parent }) => (
                  <BudgetRow
                    key={cat.id}
                    category={cat}
                    parentName={parent?.name}
                    row={data[cat.id] ?? EMPTY_ROW}
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
  parentName,
  row,
  period,
  currency,
  onSaved,
}: {
  category: { id: string; name: string; icon: string; color: string };
  /** Назва батьківської категорії — задана лише для підкатегорій. */
  parentName?: string;
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
    <Card className={cn(parentName && "ml-4 sm:ml-10")}>
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: category.color + "22", color: category.color }}
          >
            <Icon name={category.icon} className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            {/* На телефоні назва й суми — окремими рядками, щоб назва не обрізалась */}
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <div className="min-w-0">
                {parentName && (
                  <p className="truncate text-[11px] leading-tight text-fg-subtle">{parentName} ›</p>
                )}
                <p className="truncate text-sm font-medium text-fg">{category.name}</p>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold sm:shrink-0 sm:text-sm",
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

          <div className="relative w-24 shrink-0 sm:w-28">
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
