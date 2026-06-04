"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { DailyBarChart, CategoryDonut } from "@/components/charts/charts";
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

  const { inRange, prevRange, bars, label } = useMemo(
    () => computePeriod(expenses, period),
    [expenses, period],
  );

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
      {/* Перемикач періоду */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                period === p.key ? "bg-primary text-white" : "text-fg-muted hover:text-fg",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
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
    </div>
  );
}

/** Готує дані для періоду: фільтрує витрати та будує бари. */
function computePeriod(expenses: ExpenseWithCategory[], period: Period) {
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

  // month
  const y = now.getFullYear();
  const m = now.getMonth();
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
  return { inRange, prevRange, bars, label: MONTHS_SHORT[m] };
}
