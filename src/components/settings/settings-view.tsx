"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useTheme } from "@/components/theme/theme-provider";
import { InstallButton } from "@/components/pwa/install-button";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/actions/profile";
import { CURRENCIES } from "@/lib/constants";
import { formatDateUk, cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function SettingsView({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [currency, setCurrency] = useState(profile?.base_currency ?? "UAH");
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  function save() {
    setSaved(false);
    startTransition(async () => {
      const res = await updateProfile({ display_name: name, base_currency: currency });
      if (!res.error) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("expenses")
        .select("spent_at, amount, currency, comment, category:expense_categories!expenses_category_id_fkey(name)")
        .order("spent_at", { ascending: false });

      const rows = [["Дата", "Категорія", "Сума", "Валюта", "Коментар"]];
      for (const e of (data ?? []) as unknown as {
        spent_at: string;
        amount: number;
        currency: string;
        comment: string | null;
        category: { name: string } | null;
      }[]) {
        rows.push([
          e.spent_at,
          e.category?.name ?? "Без категорії",
          String(e.amount),
          e.currency,
          (e.comment ?? "").replace(/"/g, '""'),
        ]);
      }
      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Профіль */}
      <Card>
        <CardHeader>
          <CardTitle>Профіль</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="s-name">Імʼя</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-cur">Базова валюта</Label>
            <Select id="s-cur" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.label}
                </option>
              ))}
            </Select>
          </div>
          {profile && (
            <p className="text-xs text-fg-subtle">
              Акаунт створено: {formatDateUk(profile.created_at)}
            </p>
          )}
          <Button onClick={save} loading={pending}>
            {saved ? <><Check className="h-4 w-4" /> Збережено</> : "Зберегти"}
          </Button>
        </CardContent>
      </Card>

      {/* Вигляд */}
      <Card>
        <CardHeader>
          <CardTitle>Вигляд</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "light", label: "Світла", icon: Sun },
              { key: "dark", label: "Темна", icon: Moon },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 transition-colors",
                  theme === key ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong",
                )}
              >
                <Icon className={cn("h-5 w-5", theme === key ? "text-primary" : "text-fg-muted")} />
                <span className="font-medium text-fg">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Застосунок */}
      <Card>
        <CardHeader>
          <CardTitle>Застосунок</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-fg-muted">
            Встанови на телефон чи комп'ютер — іконка на головному екрані й повноекранний режим.
          </p>
          <InstallButton />
        </CardContent>
      </Card>

      {/* Дані */}
      <Card>
        <CardHeader>
          <CardTitle>Дані</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-fg-muted">
            Експортуйте всі свої витрати у форматі CSV (Excel / Google Sheets).
          </p>
          <Button variant="outline" onClick={exportCsv} loading={exporting}>
            <Download className="h-4 w-4" /> Експортувати витрати (CSV)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
