"use client";

import { usePathname } from "next/navigation";
import { Plus, Search, Command } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { useApp } from "@/components/app/app-shell";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import type { Profile } from "@/lib/types";

const TITLES: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((i) => [i.href, i.label]),
);

export function Topbar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const { openExpense, openPalette } = useApp();
  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([href]) => pathname.startsWith(href))?.[1] ??
    "Бюджет";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <h1 className="text-lg font-semibold text-fg">{title}</h1>

      <div className="flex-1" />

      {/* Тригер палітри команд */}
      <button
        onClick={openPalette}
        className="hidden items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg-subtle transition-colors hover:border-border-strong sm:flex"
      >
        <Search className="h-4 w-4" />
        Пошук та дії
        <kbd className="ml-2 flex items-center gap-0.5 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-muted">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <button
        onClick={() => openExpense()}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover active:scale-[0.97]"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Витрата</span>
      </button>

      <ThemeToggle />
      <UserMenu profile={profile} />
    </header>
  );
}
