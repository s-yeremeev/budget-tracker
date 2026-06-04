"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { createExpenseCategory } from "@/lib/actions/expenses";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/types";

interface Props {
  onCreated: (cat: ExpenseCategory) => void;
  onCancel: () => void;
  parentId?: string | null;
  /** Колір батьківської категорії — використовується як стартовий для підкатегорії. */
  defaultColor?: string;
}

export function CategoryCreateInline({ onCreated, onCancel, parentId = null, defaultColor }: Props) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [color, setColor] = useState(defaultColor ?? CATEGORY_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  function create() {
    if (!name.trim()) {
      setError(parentId ? "Введіть назву підкатегорії." : "Введіть назву категорії.");
      return;
    }
    startTransition(async () => {
      const res = await createExpenseCategory({ name: name.trim(), icon, color, parent_id: parentId });
      if (res.error || !res.data) {
        setError(res.error ?? "Не вдалося створити категорію.");
        return;
      }
      onCreated(res.data);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-3">
      <Input
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        placeholder={parentId ? "Назва підкатегорії" : "Назва категорії"}
        className="bg-bg-elevated"
      />

      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-muted">Колір</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "h-6 w-6 rounded-full transition-transform",
                color === c && "ring-2 ring-offset-2 ring-offset-surface-2 scale-110",
              )}
              style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-muted">Іконка</p>
        <div className="grid max-h-28 grid-cols-7 gap-1.5 overflow-y-auto sm:grid-cols-9">
          {CATEGORY_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className={cn(
                "flex h-9 items-center justify-center rounded-lg border transition-colors",
                icon === ic
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-transparent bg-bg-elevated text-fg-muted hover:text-fg",
              )}
            >
              <Icon name={ic} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={onCancel}>
          Скасувати
        </Button>
        <Button type="button" size="sm" className="flex-1" loading={pending} onClick={create}>
          <Check className="h-4 w-4" /> Створити
        </Button>
      </div>
    </div>
  );
}
