"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/app/app-shell";

export function AddExpenseButton({ label = "Додати витрату" }: { label?: string }) {
  const { openExpense } = useApp();
  return (
    <Button onClick={() => openExpense()}>
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}
