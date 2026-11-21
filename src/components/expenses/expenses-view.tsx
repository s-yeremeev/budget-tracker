"use client";

import { useMemo, useState } from "react";
import { Search, ListFilter, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpenseList } from "@/components/expenses/expense-list";
import { useApp } from "@/components/app/app-shell";
import { convert } from "@/lib/currency";
import { FILTER_ALL, FILTER_NONE, matchesCategoryFilter, subcategoriesOf } from "@/lib/category-filter";
import { formatCurrency, formatDateUk, monthBounds, toISODate, cn } from "@/lib/utils";
import type { ExpenseCategory, ExpenseWithCategory } from "@/lib/types";

type Period = "month" | "prev" | "year" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "Цей місяць" },
  { key: "prev", label: "Минулий" },
  { key: "year", label: "Рік" },
  { key: "all", label: "Увесь час" },
];

export function ExpensesView({
  expenses,
  categories,
}: {
  expenses: ExpenseWithCategory[];
  categories: ExpenseCategory[];
}) {
  const { openExpense, currency: base, rates } = useApp();
  const [period, setPeriod] = useState<Period>("month");
  const [categoryId, setCategoryId] = useState<string>(FILTER_ALL);
  const [subcategoryId, setSubcategoryId] = useState<string>(FILTER_ALL);
  const [tag, setTag] = useState<string>("all");
  const [search, setSearch] = useState("");

  const subOptions = useMemo(() => subcategoriesOf(categories, categoryId), [categories, categoryId]);
  const nameById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of expenses) for (const t of e.tags ?? []) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b, "uk"));
  }, [expenses]);

  const range = useMemo(() => {
    const now = new Date();
    if (period === "month") return monthBounds(now);
    if (period === "prev")
      return monthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    if (period === "year")
      return {
        start: toISODate(new Date(now.getFullYear(), 0, 1)),
        end: toISODate(new Date(now.getFullYear(), 11, 31)),
      };
    return { start: "0000-01-01", end: "9999-12-31" };
  }, [period]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (e.spent_at < range.start || e.spent_at > range.end) return false;
      if (!matchesCategoryFilter(e, categoryId, subcategoryId)) return false;
      if (tag !== "all" && !(e.tags ?? []).includes(tag)) return false;
      if (q) {
        const subName = e.subcategory_id ? nameById.get(e.subcategory_id) ?? "" : "";
        const haystack = [e.comment ?? "", e.category?.name ?? "", subName];
        if (!haystack.some((s) => s.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [expenses, range, categoryId, subcategoryId, tag, search, nameById]);

  const total = filtered.reduce((s, e) => s + convert(Number(e.amount), e.currency, base, rates), 0);

  // Групування за датою
  const groups = useMemo(() => {
    const map = new Map<string, ExpenseWithCategory[]>();
    for (const e of filtered) {
      const arr = map.get(e.spent_at) ?? [];
      arr.push(e);
      map.set(e.spent_at, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* Період */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                period === p.key ? "bg-primary text-white" : "text-fg-muted hover:text-fg",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <p className="text-xs text-fg-subtle">{filtered.length} транзакцій</p>
          <p className="text-lg font-bold text-fg">{formatCurrency(total, base)}</p>
        </div>
      </div>

      {/* Фільтри */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за категорією чи коментарем…"
            className="pl-9"
          />
        </div>
        <div className="relative sm:w-56">
          <ListFilter className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId(FILTER_ALL);
            }}
            className="pl-9"
            aria-label="Категорія"
          >
            <option value={FILTER_ALL}>Усі категорії</option>
            {categories
              .filter((c) => !c.parent_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </div>
        {subOptions.length > 0 && (
          <Select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            className="sm:w-52"
            aria-label="Підкатегорія"
          >
            <option value={FILTER_ALL}>Усі підкатегорії</option>
            <option value={FILTER_NONE}>Без підкатегорії</option>
            {subOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
        {availableTags.length > 0 && (
          <Select value={tag} onChange={(e) => setTag(e.target.value)} className="sm:w-44">
            <option value="all">Усі теги</option>
            {availableTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* Список */}
      <Card>
        <CardContent className="py-2">
          {groups.length === 0 ? (
            <EmptyState
              icon="Receipt"
              title="Витрат не знайдено"
              description="Змініть фільтри або додайте нову витрату."
              action={
                <button
                  onClick={() => openExpense()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  <Plus className="h-4 w-4" /> Додати витрату
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {groups.map(([date, items]) => {
                const dayTotal = items.reduce((s, e) => s + convert(Number(e.amount), e.currency, base, rates), 0);
                return (
                  <div key={date} className="py-1">
                    <div className="flex items-center justify-between pt-3 pb-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                        {formatDateUk(date)}
                      </span>
                      <span className="text-xs font-medium text-fg-muted">
                        {formatCurrency(dayTotal, base)}
                      </span>
                    </div>
                    <ExpenseList expenses={items} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
