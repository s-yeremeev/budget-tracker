"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useApp } from "@/components/app/app-shell";
import { CategoryCreateInline } from "@/components/expenses/category-create-inline";
import { deleteExpenseCategory, updateExpenseCategory } from "@/lib/actions/expenses";
import { cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/types";

/** Керування категоріями витрат: перейменування, видалення, нові категорії/підкатегорії. */
export function CategoryManager() {
  const router = useRouter();
  const { categories } = useApp();
  const [creatingFor, setCreatingFor] = useState<string | "top" | null>(null);
  const tops = categories.filter((c) => !c.parent_id);

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-xl border border-border">
        {tops.map((top) => (
          <li key={top.id} className="px-3 py-1.5">
            <CategoryRow category={top} />
            <ul className="ml-8">
              {categories
                .filter((c) => c.parent_id === top.id)
                .map((sub) => (
                  <li key={sub.id}>
                    <CategoryRow category={sub} parentName={top.name} />
                  </li>
                ))}
            </ul>
            {creatingFor === top.id ? (
              <div className="ml-8 py-2">
                <CategoryCreateInline
                  parentId={top.id}
                  defaultColor={top.color}
                  onCreated={() => {
                    setCreatingFor(null);
                    router.refresh();
                  }}
                  onCancel={() => setCreatingFor(null)}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreatingFor(top.id)}
                className="ml-8 flex items-center gap-1 py-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Підкатегорія
              </button>
            )}
          </li>
        ))}
      </ul>

      {creatingFor === "top" ? (
        <CategoryCreateInline
          onCreated={() => {
            setCreatingFor(null);
            router.refresh();
          }}
          onCancel={() => setCreatingFor(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreatingFor("top")}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <Plus className="h-4 w-4" /> Нова категорія
        </button>
      )}
    </div>
  );
}

function CategoryRow({ category, parentName }: { category: ExpenseCategory; parentName?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return setError("Назва не може бути порожньою.");
    if (trimmed === category.name) return setEditing(false);
    setError(null);
    startTransition(async () => {
      const res = await updateExpenseCategory(category.id, {
        name: trimmed,
        icon: category.icon,
        color: category.color,
        parent_id: category.parent_id,
      });
      if (res.error) return setError(res.error);
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await deleteExpenseCategory(category.id);
      if (res.error) return setError(res.error);
      router.refresh();
    });
  }

  const isSub = !!parentName;

  return (
    <div className={cn("py-1.5", pending && "opacity-50")}>
      <div className="flex items-center gap-2.5">
        <span
          className={cn("flex shrink-0 items-center justify-center rounded-lg", isSub ? "h-7 w-7" : "h-8 w-8")}
          style={{ backgroundColor: category.color + "22", color: category.color }}
        >
          <Icon name={category.icon} className="h-4 w-4" />
        </span>

        {editing ? (
          <>
            <Input
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") {
                  setName(category.name);
                  setEditing(false);
                }
              }}
              className="h-8 flex-1"
              aria-label="Нова назва"
            />
            <button type="button" onClick={save} className="rounded-lg p-1.5 text-success hover:bg-surface-2" aria-label="Зберегти назву">
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setName(category.name);
                setEditing(false);
              }}
              className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2"
              aria-label="Скасувати"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <span className={cn("flex-1 truncate text-fg", isSub ? "text-sm" : "text-sm font-medium")}>{category.name}</span>
            {!confirming && (
              <>
                <button type="button" onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label={`Перейменувати «${category.name}»`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setConfirming(true)} className="rounded-lg p-1.5 text-fg-subtle hover:bg-danger-soft hover:text-danger" aria-label={`Видалити «${category.name}»`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {confirming && (
        <div className="mt-2 rounded-lg bg-danger-soft p-2.5 text-xs text-danger">
          <p>
            {isSub
              ? `Видалити підкатегорію «${category.name}»? Її витрати лишаться в «${parentName}» без підкатегорії; ліміт бюджету для неї видалиться.`
              : `Видалити категорію «${category.name}»? Її підкатегорії та ліміти бюджету теж видаляться, а витрати лишаться без категорії.`}
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={remove} className="rounded-md bg-danger px-2.5 py-1 font-medium text-white">
              Видалити
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-md px-2.5 py-1 text-fg-muted hover:bg-surface-2">
              Скасувати
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
