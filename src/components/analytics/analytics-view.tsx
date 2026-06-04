"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { DailyBarChart, CategoryDonut, MultiLineChart } from "@/components/charts/charts";
import { formatCurrency, percentChange, cn } from "@/lib/utils";
import type { ExpenseWithCategory } from "@/lib/types";

type Period = "week" | "month" | "year";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Тиждень" },
  { key: "month", label: "Місяць" },
  { key: "year", label: "Рік" },
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const MONTHS_SHORT = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"];

export function AnalyticsView({ expenses }: { expenses: ExpenseWithCategory[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [monthOffset, setMonthOffset] = useState(0); // 0 = поточний місяць

  const { inRange, prevRange, bars, label } = useMemo(
    () => computePeriod(expenses, period, monthOffset),
    [expenses, period, monthOffset],
  );

  const trend = useMemo(() => buildMonthlyTrend(expenses, 6), [expenses]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visibleSeries = trend.series.filter((s) => !hidden.has(s.key));

  const total = inRange.reduce((s, e) => s + Number(e.amount), 0);
  const prevTotal = prevRange.reduce((s, e) => s + Number(e.amount), 0);
  const change = percentChange(total, prevTotal);

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; icon: string; total: number }>();
    for (const e of inRange) {
      const key = e.category?.id ?? "none";
      const ex = map.get(key);
      if (ex) ex.total += Number(e.amount);
      else
        map.set(key, {
          name: e.category?.name ?? "Без категорії",
          color: e.category?.color ?? "#64748b",
          icon: e.category?.icon ?? "Tag",
          total: Number(e.amount),
        });
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [inRange]);

  const donut = byCategory.slice(0, 8).map((c) => ({ name: c.name, value: c.total, color: c.color }));
  const maxCat = byCategory[0]?.total ?? 1;

  return (
    <div className="space-y-6">
      {/* Перемикач періоду + навігація по місяцях */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setPeriod(p.key);
                setMonthOffset(0);
              }}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                period === p.key ? "bg-primary text-white" : "text-fg-muted hover:text-fg",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === "month" && (
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
            <button
              onClick={() => setMonthOffset((o) => o - 1)}
              className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-2"
              aria-label="Попередній місяць"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-28 text-center text-sm font-medium text-fg">{label}</span>
            <button
              onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
              disabled={monthOffset >= 0}
              className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-2 disabled:opacity-40"
              aria-label="Наступний місяць"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Підсумок + порівняння */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-fg-muted">Витрачено · {label}</p>
            <p className="mt-1 text-2xl font-bold text-fg">{formatCurrency(total, "UAH")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-fg-muted">Попередній період</p>
            <p className="mt-1 text-2xl font-bold text-fg">{formatCurrency(prevTotal, "UAH")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-fg-muted">Зміна</p>
            <p
              className={cn(
                "mt-1 flex items-center gap-1.5 text-2xl font-bold",
                change === null ? "text-fg" : change > 0 ? "text-danger" : "text-success",
              )}
            >
              {change !== null &&
                (change > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />)}
              {change === null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(0)}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      {total === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon="ChartColumn" title="Немає даних за період" description="Додайте витрати, щоб побачити аналітику." />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Графік по днях/місяцях */}
          <Card>
            <CardHeader>
              <CardTitle>Динаміка витрат</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyBarChart data={bars} currency="UAH" />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Donut */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Розподіл</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryDonut data={donut} currency="UAH" />
              </CardContent>
            </Card>

            {/* Топ категорій */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Топ категорій</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {byCategory.map((c) => (
                  <div key={c.name}>
                    <div className="mb-1 flex items-center gap-2 text-sm">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{ backgroundColor: c.color + "22", color: c.color }}
                      >
                        <Icon name={c.icon} className="h-4 w-4" />
                      </span>
                      <span className="flex-1 truncate font-medium text-fg">{c.name}</span>
                      <span className="text-fg-muted">{formatCurrency(c.total, "UAH")}</span>
                      <span className="w-10 text-right text-xs text-fg-subtle">
                        {((c.total / total) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(c.total / maxCat) * 100}%`, background: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Категорії за місяцями */}
      {trend.series.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Категорії за місяцями</CardTitle>
            <span className="text-xs text-fg-subtle">останні 6 місяців</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Перемикачі категорій */}
            <div className="flex flex-wrap gap-2">
              {trend.series.map((s) => {
                const off = hidden.has(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() =>
                      setHidden((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.key)) next.delete(s.key);
                        else next.add(s.key);
                        return next;
                      })
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      off ? "border-border text-fg-subtle opacity-60" : "border-border-strong text-fg",
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: off ? "var(--fg-subtle)" : s.color }} />
                    {s.name}
                  </button>
                );
              })}
            </div>

            {visibleSeries.length > 0 ? (
              <MultiLineChart data={trend.data} series={visibleSeries} currency="UAH" />
            ) : (
              <p className="py-10 text-center text-sm text-fg-subtle">Оберіть хоча б одну категорію</p>
            )}

            {/* Таблиця місяць × категорія */}
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-fg-subtle">
                    <th className="py-2 pr-3 text-left font-medium">Категорія</th>
                    {trend.months.map((mm) => (
                      <th key={mm.label} className="px-2 py-2 text-right font-medium">{mm.label}</th>
                    ))}
                    <th className="pl-2 py-2 text-right font-medium">Усього</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.topIds.map((id) => {
                    const meta = trend.catMeta.get(id)!;
                    const rowTotal = trend.rowTotals.find((r) => r.id === id)?.total ?? 0;
                    return (
                      <tr key={id} className="border-t border-border">
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                            <span className="truncate text-fg">{meta.name}</span>
                          </span>
                        </td>
                        {trend.months.map((_, mi) => {
                          const v = trend.monthData[mi][id] ?? 0;
                          return (
                            <td key={mi} className="px-2 py-2 text-right tabular-nums text-fg-muted">
                              {v ? formatCurrency(v, "UAH", { compact: true }) : "—"}
                            </td>
                          );
                        })}
                        <td className="pl-2 py-2 text-right font-semibold tabular-nums text-fg">
                          {formatCurrency(rowTotal, "UAH", { compact: true })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Готує дані для періоду: фільтрує витрати та будує бари. */
function computePeriod(expenses: ExpenseWithCategory[], period: Period, monthOffset = 0) {
  const now = new Date();
  const parse = (s: string) => new Date(s + "T00:00:00");

  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const prevStart = new Date(start);
    prevStart.setDate(start.getDate() - 7);

    const inRange = expenses.filter((e) => parse(e.spent_at) >= start);
    const prevRange = expenses.filter(
      (e) => parse(e.spent_at) >= prevStart && parse(e.spent_at) < start,
    );

    const bars = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const amount = inRange
        .filter((e) => e.spent_at === key)
        .reduce((s, e) => s + Number(e.amount), 0);
      return { label: WEEKDAYS[(d.getDay() + 6) % 7], amount };
    });
    return { inRange, prevRange, bars, label: "тиждень" };
  }

  if (period === "year") {
    const year = now.getFullYear();
    const inRange = expenses.filter((e) => parse(e.spent_at).getFullYear() === year);
    const prevRange = expenses.filter((e) => parse(e.spent_at).getFullYear() === year - 1);
    const bars = MONTHS_SHORT.map((m, i) => ({
      label: m,
      amount: inRange
        .filter((e) => parse(e.spent_at).getMonth() === i)
        .reduce((s, e) => s + Number(e.amount), 0),
    }));
    return { inRange, prevRange, bars, label: String(year) };
  }

  // month (з урахуванням зсуву)
  const ref = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const inRange = expenses.filter((e) => {
    const d = parse(e.spent_at);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  const prevMonthRef = new Date(y, m - 1, 1);
  const prevRange = expenses.filter((e) => {
    const d = parse(e.spent_at);
    return d.getFullYear() === prevMonthRef.getFullYear() && d.getMonth() === prevMonthRef.getMonth();
  });
  const bars = Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const amount = inRange
      .filter((e) => parse(e.spent_at).getDate() === day)
      .reduce((s, e) => s + Number(e.amount), 0);
    return { label: String(day), amount };
  });
  return { inRange, prevRange, bars, label: `${MONTHS_SHORT[m]} ${y}` };
}

/** Будує дані тренду витрат по топ-категоріях за останні N місяців. */
function buildMonthlyTrend(expenses: ExpenseWithCategory[], n: number) {
  const now = new Date();
  const parse = (s: string) => new Date(s + "T00:00:00");

  const months = Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { y: d.getFullYear(), m: d.getMonth(), label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` };
  });

  const catMeta = new Map<string, { name: string; color: string }>();
  const monthData: Record<string, number>[] = months.map(() => ({}));

  for (const e of expenses) {
    const d = parse(e.spent_at);
    const idx = months.findIndex((mm) => mm.y === d.getFullYear() && mm.m === d.getMonth());
    if (idx < 0) continue;
    const id = e.category?.id ?? "none";
    if (!catMeta.has(id))
      catMeta.set(id, { name: e.category?.name ?? "Без категорії", color: e.category?.color ?? "#64748b" });
    monthData[idx][id] = (monthData[idx][id] ?? 0) + Number(e.amount);
  }

  const totals = new Map<string, number>();
  for (const md of monthData) for (const k in md) totals.set(k, (totals.get(k) ?? 0) + md[k]);

  const topIds = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
  const series = topIds.map((id) => ({ key: id, name: catMeta.get(id)!.name, color: catMeta.get(id)!.color }));
  const data = months.map((mm, idx) => {
    const row: Record<string, number | string> = { label: mm.label };
    for (const id of topIds) row[id] = monthData[idx][id] ?? 0;
    return row;
  });
  const rowTotals = topIds.map((id) => ({ id, total: totals.get(id) ?? 0 }));

  return { series, data, months, monthData, topIds, rowTotals, catMeta };
}
