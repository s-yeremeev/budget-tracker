"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Wallet, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { IncomeForm } from "@/components/income/income-form";
import { deleteIncome } from "@/lib/actions/incomes";
import { formatCurrency, formatDateUk, monthBounds, toISODate, cn } from "@/lib/utils";
import type { IncomeWithAsset, Income } from "@/lib/types";

type Period = "month" | "prev" | "year" | "all";
const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "Цей місяць" },
  { key: "prev", label: "Минулий" },
  { key: "year", label: "Рік" },
  { key: "all", label: "Увесь час" },
];

export function IncomeView({ incomes }: { incomes: IncomeWithAsset[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);

  const range = useMemo(() => {
    const now = new Date();
    if (period === "month") return monthBounds(now);
    if (period === "prev") return monthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    if (period === "year")
      return { start: toISODate(new Date(now.getFullYear(), 0, 1)), end: toISODate(new Date(now.getFullYear(), 11, 31)) };
    return { start: "0000-01-01", end: "9999-12-31" };
  }, [period]);

  const filtered = useMemo(
    () => incomes.filter((i) => i.received_at >= range.start && i.received_at <= range.end),
    [incomes, range],
  );
  const total = filtered.reduce((s, i) => s + Number(i.amount), 0);

  const groups = useMemo(() => {
    const map = new Map<string, IncomeWithAsset[]>();
    for (const i of filtered) {
      const arr = map.get(i.received_at) ?? [];
      arr.push(i);
      map.set(i.received_at, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  function add() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div className="space-y-5">
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
          <p className="text-xs text-fg-subtle">{filtered.length} надходжень</p>
          <p className="text-lg font-bold text-success">+{formatCurrency(total, "UAH")}</p>
        </div>
        <Button onClick={add}>
          <Plus className="h-4 w-4" /> Дохід
        </Button>
      </div>

      <Card>
        <CardContent className="py-2">
          {groups.length === 0 ? (
            <EmptyState
              icon="Banknote"
              title="Немає доходів за період"
              description="Додайте дохід, щоб бачити баланс місяця та норму заощаджень."
              action={
                <Button onClick={add}>
                  <Plus className="h-4 w-4" /> Додати дохід
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {groups.map(([date, items]) => {
                const dayTotal = items.reduce((s, i) => s + Number(i.amount), 0);
                return (
                  <div key={date} className="py-1">
                    <div className="flex items-center justify-between pt-3 pb-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{formatDateUk(date)}</span>
                      <span className="text-xs font-medium text-success">+{formatCurrency(dayTotal, "UAH")}</span>
                    </div>
                    <ul className="divide-y divide-border">
                      {items.map((i) => (
                        <IncomeRow key={i.id} income={i} onEdit={() => { setEditing(i); setOpen(true); }} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Редагувати дохід" : "Новий дохід"}>
        <IncomeForm income={editing} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  );
}

function IncomeRow({ income, onEdit }: { income: IncomeWithAsset; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function remove() {
    startTransition(async () => {
      await deleteIncome(income.id);
      router.refresh();
    });
  }

  return (
    <li className={cn("group flex items-center gap-3 py-3", pending && "opacity-40")}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
        <Banknote className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{income.source}</p>
        <p className="flex items-center gap-1.5 truncate text-xs text-fg-subtle">
          <span className="truncate">
            {formatDateUk(income.received_at)}
            {income.comment ? ` · ${income.comment}` : ""}
          </span>
          {income.asset && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">
              <Wallet className="h-3 w-3" />
              {income.asset.name}
            </span>
          )}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-success">
        +{formatCurrency(Number(income.amount), income.currency)}
      </span>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {confirming ? (
          <div className="flex items-center gap-1">
            <button onClick={remove} className="rounded-lg bg-danger px-2 py-1 text-xs font-medium text-white">Видалити</button>
            <button onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1 text-xs text-fg-muted hover:bg-surface-2">Ні</button>
          </div>
        ) : (
          <>
            <button onClick={onEdit} className="rounded-lg p-2 text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label="Редагувати">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setConfirming(true)} className="rounded-lg p-2 text-fg-subtle hover:bg-danger-soft hover:text-danger" aria-label="Видалити">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
