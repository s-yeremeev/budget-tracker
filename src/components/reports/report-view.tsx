"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, Loader2, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/app/app-shell";
import { createClient } from "@/lib/supabase/client";
import { convert } from "@/lib/currency";
import { formatCurrency, formatDateUk, monthBounds, toISODate, cn } from "@/lib/utils";

type Preset = "month" | "prev" | "year" | "custom";
const PRESETS: { key: Preset; label: string }[] = [
  { key: "month", label: "Цей місяць" },
  { key: "prev", label: "Минулий місяць" },
  { key: "year", label: "Цей рік" },
  { key: "custom", label: "Власний" },
];

interface ExpRow {
  amount: number;
  currency: string;
  spent_at: string;
  comment: string | null;
  category: { name: string; color: string; icon: string } | null;
}
interface IncRow {
  amount: number;
  currency: string;
  received_at: string;
  source: string;
}

export function ReportView() {
  const { currency: base, rates } = useApp();
  const supabase = createClient();

  const [preset, setPreset] = useState<Preset>("month");
  const now = new Date();
  const [customStart, setCustomStart] = useState(toISODate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(toISODate(now));

  const [expenses, setExpenses] = useState<ExpRow[]>([]);
  const [incomes, setIncomes] = useState<IncRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState("");

  const range = useMemo(() => {
    const n = new Date();
    if (preset === "month") return monthBounds(n);
    if (preset === "prev") return monthBounds(new Date(n.getFullYear(), n.getMonth() - 1, 1));
    if (preset === "year")
      return { start: toISODate(new Date(n.getFullYear(), 0, 1)), end: toISODate(new Date(n.getFullYear(), 11, 31)) };
    return { start: customStart, end: customEnd };
  }, [preset, customStart, customEnd]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: exp }, { data: inc }] = await Promise.all([
      supabase
        .from("expenses")
        .select("amount, currency, spent_at, comment, category:expense_categories!expenses_category_id_fkey(name, color, icon)")
        .gte("spent_at", range.start)
        .lte("spent_at", range.end)
        .order("spent_at", { ascending: false }),
      supabase
        .from("incomes")
        .select("amount, currency, received_at, source")
        .gte("received_at", range.start)
        .lte("received_at", range.end)
        .order("received_at", { ascending: false }),
    ]);
    setExpenses((exp as unknown as ExpRow[]) ?? []);
    setIncomes((inc as unknown as IncRow[]) ?? []);
    setLoading(false);
  }, [supabase, range.start, range.end]);

  useEffect(() => {
    load();
  }, [load]);

  const totalExpense = expenses.reduce((s, e) => s + convert(Number(e.amount), e.currency, base, rates), 0);
  const totalIncome = incomes.reduce((s, i) => s + convert(Number(i.amount), i.currency, base, rates), 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : null;

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number }>();
    for (const e of expenses) {
      const key = e.category?.name ?? "Без категорії";
      const amt = convert(Number(e.amount), e.currency, base, rates);
      const ex = map.get(key);
      if (ex) ex.total += amt;
      else map.set(key, { name: key, color: e.category?.color ?? "#64748b", total: amt });
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [expenses, base, rates]);

  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of incomes) {
      map.set(i.source, (map.get(i.source) ?? 0) + convert(Number(i.amount), i.currency, base, rates));
    }
    return [...map.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [incomes, base, rates]);

  function periodLabel() {
    return `${formatDateUk(range.start)} — ${formatDateUk(range.end)}`;
  }

  function printPdf() {
    setGeneratedAt(formatDateUk(new Date()));
    // дати React оновити підпис перед діалогом друку
    setTimeout(() => window.print(), 50);
  }

  return (
    <div className="space-y-5">
      {/* Контроли (не друкуються) */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="inline-flex flex-wrap rounded-xl border border-border bg-surface p-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                preset === p.key ? "bg-primary text-white" : "text-fg-muted hover:text-fg",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-auto" />
            <span className="text-fg-subtle">—</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-auto" />
          </div>
        )}
        <div className="flex-1" />
        <Button onClick={printPdf} disabled={loading}>
          <Printer className="h-4 w-4" /> Завантажити PDF
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-fg-subtle">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Шапка звіту */}
          <div className="print-block flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
                <Wallet className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-fg">Фінансовий звіт</h1>
                <p className="text-sm text-fg-muted">{periodLabel()}</p>
              </div>
            </div>
            <div className="text-right text-xs text-fg-subtle">
              <p>Валюта: {base}</p>
              {generatedAt && <p>Сформовано: {generatedAt}</p>}
            </div>
          </div>

          {/* Підсумок */}
          <div className="print-block grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Доходи" value={formatCurrency(totalIncome, base)} tone="success" />
            <Stat label="Витрати" value={formatCurrency(totalExpense, base)} tone="danger" />
            <Stat label="Баланс" value={formatCurrency(balance, base, { sign: true })} tone={balance >= 0 ? "success" : "danger"} />
            <Stat label="Норма заощаджень" value={savingsRate !== null ? `${savingsRate.toFixed(0)}%` : "—"} />
          </div>

          {/* Витрати за категоріями */}
          <Card className="print-block">
            <CardContent>
              <h2 className="mb-3 text-base font-semibold text-fg">Витрати за категоріями</h2>
              {byCategory.length === 0 ? (
                <p className="text-sm text-fg-subtle">Немає витрат за період.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-fg-subtle">
                      <th className="py-1.5 font-medium">Категорія</th>
                      <th className="py-1.5 text-right font-medium">Сума</th>
                      <th className="w-16 py-1.5 text-right font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCategory.map((c) => (
                      <tr key={c.name} className="border-t border-border">
                        <td className="py-1.5">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                            <span className="text-fg">{c.name}</span>
                          </span>
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-fg">{formatCurrency(c.total, base)}</td>
                        <td className="py-1.5 text-right tabular-nums text-fg-muted">
                          {totalExpense ? ((c.total / totalExpense) * 100).toFixed(0) : 0}%
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border-strong font-semibold">
                      <td className="py-1.5 text-fg">Разом</td>
                      <td className="py-1.5 text-right tabular-nums text-fg">{formatCurrency(totalExpense, base)}</td>
                      <td className="py-1.5 text-right text-fg-muted">100%</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Доходи за джерелами */}
          {bySource.length > 0 && (
            <Card className="print-block">
              <CardContent>
                <h2 className="mb-3 text-base font-semibold text-fg">Доходи за джерелами</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-fg-subtle">
                      <th className="py-1.5 font-medium">Джерело</th>
                      <th className="py-1.5 text-right font-medium">Сума</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySource.map((s) => (
                      <tr key={s.name} className="border-t border-border">
                        <td className="py-1.5 text-fg">{s.name}</td>
                        <td className="py-1.5 text-right tabular-nums text-fg">{formatCurrency(s.total, base)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border-strong font-semibold">
                      <td className="py-1.5 text-fg">Разом</td>
                      <td className="py-1.5 text-right tabular-nums text-fg">{formatCurrency(totalIncome, base)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Деталізація витрат */}
          {expenses.length > 0 && (
            <Card className="print-block">
              <CardContent>
                <h2 className="mb-3 text-base font-semibold text-fg">
                  Деталізація витрат <span className="text-fg-subtle">({expenses.length})</span>
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-fg-subtle">
                      <th className="py-1.5 font-medium">Дата</th>
                      <th className="py-1.5 font-medium">Категорія</th>
                      <th className="py-1.5 font-medium">Коментар</th>
                      <th className="py-1.5 text-right font-medium">Сума</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1.5 whitespace-nowrap text-fg-muted">{formatDateUk(e.spent_at)}</td>
                        <td className="py-1.5 text-fg">{e.category?.name ?? "—"}</td>
                        <td className="py-1.5 text-fg-muted">{e.comment ?? ""}</td>
                        <td className="py-1.5 text-right tabular-nums text-fg">
                          {formatCurrency(Number(e.amount), e.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-fg-subtle">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-fg")}>
        {value}
      </p>
    </div>
  );
}
