"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, ChevronDown, BookOpen } from "lucide-react";
import { initials } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function UserMenu({ profile }: { profile: Profile | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const name = profile?.display_name ?? "Користувач";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl p-1 pr-1.5 transition-colors hover:bg-surface-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white">
          {initials(name)}
        </span>
        <ChevronDown className="h-4 w-4 text-fg-subtle" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-30 w-56 origin-top-right animate-scale-in rounded-2xl border border-border bg-bg-elevated p-1.5 shadow-lg">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-fg">{name}</p>
            <p className="truncate text-xs text-fg-subtle">Базова валюта: {profile?.base_currency ?? "UAH"}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <a
            href="/settings"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Settings className="h-4 w-4" /> Налаштування
          </a>
          <a
            href="/help"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <BookOpen className="h-4 w-4" /> Довідка
          </a>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger-soft"
            >
              <LogOut className="h-4 w-4" /> Вийти
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
