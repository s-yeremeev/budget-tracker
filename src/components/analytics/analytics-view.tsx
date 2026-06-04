"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
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

  // Доступні місяці (останні 12) для порівняння
  const availableMonths = useMemo(() => monthsBack(12), []);
  const [compareCat, setCompareCat] = useState<string>("all");
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(
    () => new Set(availableMonths.slice(-6).map((m) => m.key)),
  );

  // Категорії для випадаючого списку (унікальні з витрат)
  const catOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    for (const e of expenses) {
      const id = e.category?.id ?? "none";
      if (!map.has(id))
        map.set(id, { id, name: e.category?.name ?? "Без категорії", color: e.category?.color ?? "#64748b" });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "uk"));
  }, [expenses]);

  const cmp = useMemo(
    () => buildComparison(expenses, availableMonths, selectedMonths, compareCat),
    [expenses, availableMonths, selectedMonths, compareCat],
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

      {/* Порівняння за місяцями */}
      <Card>
        <CardHeader>
          <CardTitle>Порівняння за місяцями</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Контроли */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-fg-muted">Категорія:</span>
              <Select
                value={compareCat}
                onChange={(e) => setCompareCat(e.target.value)}
                className="sm:w-56"
              >
                <option value="all">Усі категорії</option>
                {catOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </label>
          </div>

          {/* Вибір місяців */}
          <div>
            <p className="mb-1.5 text-sm text-fg-muted">Місяці для порівняння:</p>
            <div className="flex flex-wrap gap-1.5">
              {availableMonths.map((m) => {
                const on = selectedMonths.has(m.key);
                return (
                  <button
                    key={m.key}
                    onClick={() =>
                      setSelectedMonths((prev) => {
                        const next = new Set(prev);
                        if (next.has(m.key)) next.delete(m.key);
                        else next.add(m.key);
                        return next;
                      })
                    }
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                      on
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-fg-muted hover:border-border-strong",
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {cmp.selectedCount === 0 ? (
            <p className="py-10 text-center text-sm text-fg-subtle">Оберіть хоча б один місяць</p>
          ) : (
            <>
              {/* Статистика */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Усього" value={formatCurrency(cmp.sum, "UAH", { compact: cmp.sum > 1_000_000 })} />
                <MiniStat label="Середнє/міс" value={formatCurrency(cmp.avg, "UAH", { compact: cmp.avg > 1_000_000 })} />
                <MiniStat label="Найбільший" value={cmp.maxLabel || "—"} sub={cmp.maxAmount ? formatCurrency(cmp.maxAmount, "UAH", { compact: true }) : undefined} />
                <MiniStat
                  label="Зміна (перший→останній)"
                  value={cmp.change === null ? "—" : `${cmp.change > 0 ? "+" : ""}${cmp.change.toFixed(0)}%`}
                  tone={cmp.change === null ? undefined : cmp.change > 0 ? "danger" : "success"}
                />
              </div>

              {/* Графік */}
              {compareCat === "all" ? (
                cmp.series.length > 0 ? (
                  <MultiLineChart data={cmp.data} series={cmp.series} currency="UAH" />
                ) : (
                  <p className="py-10 text-center text-sm text-fg-subtle">Немає витрат за обрані місяці</p>
                )
              ) : (
                <DailyBarChart data={cmp.bars} currency="UAH" />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "danger" | "success" }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-3">
      <p className="text-xs text-fg-subtle">{label}</p>
      <p className={cn("mt-0.5 truncate text-base font-bold", tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-fg")}>
        {value}
      </p>
      {sub && <p className="text-xs text-fg-muted">{sub}</p>}
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

interface MonthDesc {
  key: string;
  y: number;
  m: number;
  label: string;
}

/** Останні n місяців (ascending: найстаріший → найновіший). */
function monthsBack(n: number): MonthDesc[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      y: d.getFullYear(),
      m: d.getMonth(),
      label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    };
  });
}

/** Будує дані порівняння за обрані місяці для категорії (або «Усі»). */
function buildComparison(
  expenses: ExpenseWithCategory[],
  available: MonthDesc[],
  selectedKeys: Set<string>,
  compareCat: string,
) {
  const parse = (s: string) => new Date(s + "T00:00:00");
  const months = available.filter((m) => selectedKeys.has(m.key)); // ascending
  const empty = {
    selectedCount: 0,
    series: [] as { key: string; name: string; color: string }[],
    data: [] as Record<string, number | string>[],
    bars: [] as { label: string; amount: number }[],
    sum: 0,
    avg: 0,
    maxLabel: "",
    maxAmount: 0,
    change: null as number | null,
  };
  if (months.length === 0) return empty;

  const idxOf = (d: Date) => months.findIndex((mm) => mm.y === d.getFullYear() && mm.m === d.getMonth());

  // Значення по місяцях (для статистики)
  let values: number[];
  let series: { key: string; name: string; color: string }[] = [];
  let data: Record<string, number | string>[] = [];
  let bars: { label: string; amount: number }[] = [];

  if (compareCat === "all") {
    const catMeta = new Map<string, { name: string; color: string }>();
    const monthCat: Record<string, number>[] = months.map(() => ({}));
    const monthTotal = months.map(() => 0);
    for (const e of expenses) {
      const i = idxOf(parse(e.spent_at));
      if (i < 0) continue;
      const id = e.category?.id ?? "none";
      if (!catMeta.has(id))
        catMeta.set(id, { name: e.category?.name ?? "Без категорії", color: e.category?.color ?? "#64748b" });
      const amt = Number(e.amount);
      monthCat[i][id] = (monthCat[i][id] ?? 0) + amt;
      monthTotal[i] += amt;
    }
    const totals = new Map<string, number>();
    for (const md of monthCat) for (const k in md) totals.set(k, (totals.get(k) ?? 0) + md[k]);
    const topIds = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
    series = topIds.map((id) => ({ key: id, name: catMeta.get(id)!.name, color: catMeta.get(id)!.color }));
    data = months.map((mm, i) => {
      const row: Record<string, number | string> = { label: mm.label };
      for (const id of topIds) row[id] = monthCat[i][id] ?? 0;
      return row;
    });
    values = monthTotal;
  } else {
    values = months.map(() => 0);
    for (const e of expenses) {
      if ((e.category?.id ?? "none") !== compareCat) continue;
      const i = idxOf(parse(e.spent_at));
      if (i < 0) continue;
      values[i] += Number(e.amount);
    }
    bars = months.map((mm, i) => ({ label: mm.label, amount: values[i] }));
  }

  const sum = values.reduce((s, v) => s + v, 0);
  const avg = sum / months.length;
  let maxAmount = -1;
  let maxLabel = "";
  months.forEach((mm, i) => {
    if (values[i] > maxAmount) {
      maxAmount = values[i];
      maxLabel = mm.label;
    }
  });
  const first = values[0];
  const last = values[values.length - 1];
  const change = first === 0 ? (last === 0 ? 0 : null) : ((last - first) / Math.abs(first)) * 100;

  return { selectedCount: months.length, series, data, bars, sum, avg, maxLabel, maxAmount: Math.max(maxAmount, 0), change };
}
