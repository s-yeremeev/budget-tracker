"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, Plus, CornerDownLeft } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onNewExpense: () => void;
}

interface Command {
  id: string;
  label: string;
  icon: string;
  hint?: string;
  run: () => void;
}

export function CommandPalette({ open, onClose, onNewExpense }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const commands = useMemo<Command[]>(
    () => [
      { id: "new-expense", label: "Додати витрату", icon: "Plus", hint: "⌘E", run: onNewExpense },
      ...NAV_ITEMS.map((n) => ({
        id: n.href,
        label: `Перейти: ${n.label}`,
        icon: n.icon,
        run: () => router.push(n.href),
      })),
    ],
    [router, onNewExpense],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        filtered[active]?.run();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-lg animate-slide-up">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-fg-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук дій та сторінок…"
            className="h-12 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-fg-subtle">Нічого не знайдено</p>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  c.run();
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  i === active ? "bg-surface-2 text-fg" : "text-fg-muted",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-fg-muted">
                  {c.icon === "Plus" ? <Plus className="h-4 w-4" /> : <Icon name={c.icon} className="h-4 w-4" />}
                </span>
                <span className="flex-1 font-medium">{c.label}</span>
                {c.hint && <kbd className="text-xs text-fg-subtle">{c.hint}</kbd>}
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-fg-subtle" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
