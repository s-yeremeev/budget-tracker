"use client";

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Modal } from "@/components/ui/modal";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { CommandPalette } from "@/components/app/command-palette";
import type { ExpenseCategory, Expense, Profile, Asset } from "@/lib/types";

interface AppContextValue {
  openExpense: (expense?: Expense | null) => void;
  openPalette: () => void;
  categories: ExpenseCategory[];
  assets: Asset[];
  currency: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp має бути всередині AppShell");
  return ctx;
}

interface Props {
  children: ReactNode;
  profile: Profile | null;
  categories: ExpenseCategory[];
  assets: Asset[];
}

export function AppShell({ children, profile, categories, assets }: Props) {
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const currency = profile?.base_currency ?? "UAH";

  const openExpense = useCallback((expense?: Expense | null) => {
    setEditing(expense ?? null);
    setExpenseOpen(true);
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  // Гарячі клавіші: Cmd/Ctrl+K — палітра, Cmd/Ctrl+E — нова витрата
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setEditing(null);
        setExpenseOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AppContext.Provider value={{ openExpense, openPalette, categories, assets, currency }}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar profile={profile} />
          <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10">
            <div className="mx-auto w-full max-w-6xl animate-fade-in">{children}</div>
          </main>
        </div>
        <MobileNav />
      </div>

      <Modal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        title={editing ? "Редагувати витрату" : "Нова витрата"}
      >
        <ExpenseForm
          categories={categories}
          assets={assets}
          expense={editing}
          defaultCurrency={currency}
          onDone={() => setExpenseOpen(false)}
        />
      </Modal>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNewExpense={() => {
          setPaletteOpen(false);
          setEditing(null);
          setExpenseOpen(true);
        }}
      />
    </AppContext.Provider>
  );
}
