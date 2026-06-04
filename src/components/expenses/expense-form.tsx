"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { CategoryCreateInline } from "./category-create-inline";
import { createExpense, updateExpense, type ExpenseInput } from "@/lib/actions/expenses";
import { CURRENCIES } from "@/lib/constants";
import { toISODate, formatCurrency, cn } from "@/lib/utils";
import type { ExpenseCategory, Expense, Asset } from "@/lib/types";

interface Props {
  categories: ExpenseCategory[];
  assets?: Asset[];
  expense?: Expense | null;
  defaultCurrency?: string;
  onDone: () => void;
}

export function ExpenseForm({ categories, assets = [], expense, defaultCurrency = "UAH", onDone }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const topLevel = categories.filter((c) => !c.parent_id);
  const [categoryId, setCategoryId] = useState<string | null>(
    expense?.category_id ?? topLevel[0]?.id ?? null,
  );
  const [subcategoryId, setSubcategoryId] = useState<string | null>(
    expense?.subcategory_id ?? null,
  );
  const [creatingSub, setCreatingSub] = useState(false);
  const subcategories = categories.filter((c) => c.parent_id === categoryId);
  const activeCategory = categories.find((c) => c.id === categoryId) ?? null;
  const [assetId, setAssetId] = useState<string | null>(expense?.asset_id ?? null);
  const [currency, setCurrency] = useState(expense?.currency ?? defaultCurrency);
  const [date, setDate] = useState(expense?.spent_at ?? toISODate(new Date()));
  const [comment, setComment] = useState(expense?.comment ?? "");
  const [creatingCat, setCreatingCat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) {
      setError("Введіть суму більшу за нуль.");
      return;
    }
    const input: ExpenseInput = {
      category_id: categoryId,
      subcategory_id: subcategoryId,
      asset_id: assetId,
      amount: value,
      currency,
      spent_at: date,
      comment: comment.trim() || null,
    };
    startTransition(async () => {
      const res = expense
        ? await updateExpense(expense.id, input)
        : await createExpense(input);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Сума + валюта */}
      <div>
        <Label htmlFor="amount">Сума</Label>
        <div className="flex gap-2">
          <Input
            id="amount"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="text-lg font-semibold"
          />
          <Select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-24"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Категорія */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="mb-0">Категорія</Label>
          <button
            type="button"
            onClick={() => setCreatingCat((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Нова
          </button>
        </div>

        {creatingCat ? (
          <CategoryCreateInline
            onCreated={(cat) => {
              setCategoryId(cat.id);
              setCreatingCat(false);
              router.refresh();
            }}
            onCancel={() => setCreatingCat(false)}
          />
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {topLevel.map((c) => {
              const active = c.id === categoryId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(c.id);
                    setSubcategoryId(null);
                    setCreatingSub(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all",
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: c.color + "22", color: c.color }}
                  >
                    <Icon name={c.icon} className="h-4 w-4" />
                  </span>
                  <span className="line-clamp-1 text-[11px] font-medium text-fg">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Підкатегорія */}
      {categoryId && !creatingCat && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="mb-0">Підкатегорія (необовʼязково)</Label>
            {!creatingSub && (
              <button
                type="button"
                onClick={() => setCreatingSub(true)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Нова
              </button>
            )}
          </div>

          {creatingSub ? (
            <CategoryCreateInline
              parentId={categoryId}
              defaultColor={activeCategory?.color}
              onCreated={(cat) => {
                setSubcategoryId(cat.id);
                setCreatingSub(false);
                router.refresh();
              }}
              onCancel={() => setCreatingSub(false)}
            />
          ) : subcategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {subcategories.map((s) => {
                const active = s.id === subcategoryId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubcategoryId(active ? null : s.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      active
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-fg-muted hover:border-border-strong",
                    )}
                  >
                    <Icon name={s.icon} className="h-3.5 w-3.5" />
                    {s.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-fg-subtle">
              Немає підкатегорій. Натисніть «Нова», щоб додати.
            </p>
          )}
        </div>
      )}

      {/* Списати з активу */}
      {assets.length > 0 && (
        <div>
          <Label htmlFor="asset">Списати з активу (необовʼязково)</Label>
          <Select
            id="asset"
            value={assetId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              setAssetId(id);
              const a = assets.find((x) => x.id === id);
              if (a) setCurrency(a.currency);
            }}
          >
            <option value="">— не списувати з активу —</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {formatCurrency(Number(a.value), a.currency)}
              </option>
            ))}
          </Select>
          {assetId && (
            <p className="mt-1 text-xs text-fg-subtle">
              Баланс активу зменшиться на суму витрати.
            </p>
          )}
        </div>
      )}

      {/* Дата */}
      <div>
        <Label htmlFor="date">Дата</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Коментар */}
      <div>
        <Label htmlFor="comment">Коментар (необовʼязково)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Наприклад: продукти на тиждень"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onDone}>
          Скасувати
        </Button>
        <Button type="submit" className="flex-1" loading={pending}>
          {expense ? "Зберегти" : "Додати витрату"}
        </Button>
      </div>
    </form>
  );
}
