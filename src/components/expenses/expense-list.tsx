"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Wallet } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useApp } from "@/components/app/app-shell";
import { deleteExpense } from "@/lib/actions/expenses";
import { formatCurrency, formatDateUk, cn } from "@/lib/utils";
import type { ExpenseWithCategory } from "@/lib/types";

export function ExpenseList({
  expenses,
  compact = false,
}: {
  expenses: ExpenseWithCategory[];
  compact?: boolean;
}) {
  return (
    <ul className="divide-y divide-border">
      {expenses.map((e) => (
        <ExpenseRow key={e.id} expense={e} compact={compact} />
      ))}
    </ul>
  );
}

function ExpenseRow({ expense, compact }: { expense: ExpenseWithCategory; compact: boolean }) {
  const { openExpense, categories } = useApp();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const color = expense.category?.color ?? "#64748b";
  const icon = expense.category?.icon ?? "Tag";
  const subName = expense.subcategory_id
    ? categories.find((c) => c.id === expense.subcategory_id)?.name ?? null
    : null;

  function remove() {
    startTransition(async () => {
      await deleteExpense(expense.id);
      router.refresh();
    });
  }

  return (
    <li
      className={cn(
        "group flex items-center gap-3 py-3 transition-opacity",
        pending && "opacity-40",
      )}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: color + "22", color }}
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">
          {expense.category?.name ?? "Без категорії"}
          {subName && <span className="text-fg-subtle"> › {subName}</span>}
        </p>
        <p className="flex items-center gap-1.5 truncate text-xs text-fg-subtle">
          <span className="truncate">
            {formatDateUk(expense.spent_at)}
            {expense.comment ? ` · ${expense.comment}` : ""}
          </span>
          {expense.asset && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">
              <Wallet className="h-3 w-3" />
              {expense.asset.name}
            </span>
          )}
          {expense.tags?.map((t) => (
            <span key={t} className="inline-flex shrink-0 items-center rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
              #{t}
            </span>
          ))}
        </p>
      </div>

      <span className="shrink-0 text-sm font-semibold text-fg">
        −{formatCurrency(Number(expense.amount), expense.currency)}
      </span>

      {!compact && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {confirming ? (
            <div className="flex items-center gap-1">
              <button
                onClick={remove}
                className="rounded-lg bg-danger px-2 py-1 text-xs font-medium text-white"
              >
                Видалити
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-lg px-2 py-1 text-xs text-fg-muted hover:bg-surface-2"
              >
                Ні
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => openExpense(expense)}
                className="rounded-lg p-2 text-fg-subtle hover:bg-surface-2 hover:text-fg"
                aria-label="Редагувати"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="rounded-lg p-2 text-fg-subtle hover:bg-danger-soft hover:text-danger"
                aria-label="Видалити"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
