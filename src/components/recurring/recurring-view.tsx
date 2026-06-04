"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Repeat, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { useApp } from "@/components/app/app-shell";
import { RecurringForm } from "@/components/recurring/recurring-form";
import { deleteRecurring, toggleRecurring } from "@/lib/actions/recurring";
import { formatCurrency, formatDateUk, cn } from "@/lib/utils";
import type { RecurringExpense } from "@/lib/types";

export function RecurringView({ items }: { items: RecurringExpense[] }) {
  const { categories } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);

  const monthlyTotal = items
    .filter((r) => r.active)
    .reduce((s, r) => s + Number(r.amount), 0);

  function add() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fg-muted">Регулярні витрати / міс</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-fg">
                {formatCurrency(monthlyTotal, "UAH")}
              </p>
              <p className="mt-0.5 text-xs text-fg-subtle">
                {items.filter((r) => r.active).length} активних шаблонів
              </p>
            </div>
            <Button onClick={add}>
              <Plus className="h-4 w-4" /> Додати
            </Button>
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon="Repeat"
              title="Немає повторюваних витрат"
              description="Додай підписки чи регулярні платежі — вони нараховуватимуться автоматично щомісяця."
              action={
                <Button onClick={add}>
                  <Plus className="h-4 w-4" /> Додати шаблон
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-2">
            <ul className="divide-y divide-border">
              {items.map((r) => (
                <RecurringRow
                  key={r.id}
                  item={r}
                  category={categories.find((c) => c.id === r.category_id) ?? null}
                  onEdit={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Редагувати шаблон" : "Нова повторювана витрата"}>
        <RecurringForm recurring={editing} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  );
}

function RecurringRow({
  item,
  category,
  onEdit,
}: {
  item: RecurringExpense;
  category: { name: string; color: string; icon: string } | null;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const color = category?.color ?? "#64748b";
  const icon = category?.icon ?? "Repeat";

  function toggle() {
    startTransition(async () => {
      await toggleRecurring(item.id, !item.active);
      router.refresh();
    });
  }
  function remove() {
    startTransition(async () => {
      await deleteRecurring(item.id);
      router.refresh();
    });
  }

  return (
    <li className={cn("group flex items-center gap-3 py-3", pending && "opacity-50", !item.active && "opacity-60")}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: color + "22", color }}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{item.name}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
          <span>{item.day_of_month} число · {category?.name ?? "Без категорії"}</span>
          {item.active && (
            <span className="inline-flex items-center gap-0.5">
              <CalendarClock className="h-3 w-3" /> наст. {formatDateUk(item.next_run)}
            </span>
          )}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-fg">
        {formatCurrency(Number(item.amount), item.currency)}
      </span>

      {/* Перемикач активності */}
      <button
        onClick={toggle}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          item.active ? "bg-primary" : "bg-border-strong",
        )}
        aria-label={item.active ? "Вимкнути" : "Увімкнути"}
        title={item.active ? "Активна" : "Призупинена"}
      >
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", item.active ? "left-[1.125rem]" : "left-0.5")} />
      </button>

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
