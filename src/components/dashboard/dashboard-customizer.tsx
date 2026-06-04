"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, Check, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { DASHBOARD_WIDGETS, isWidgetOn } from "@/lib/dashboard-widgets";
import { updateDashboardPrefs } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";

export function DashboardCustomizer({ prefs }: { prefs: Record<string, boolean> | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const w of DASHBOARD_WIDGETS) init[w.key] = isWidgetOn(prefs, w.key);
    return init;
  });

  const groups = ["Метрики", "Блоки"] as const;

  function toggle(key: string) {
    setLocal((p) => ({ ...p, [key]: !p[key] }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateDashboardPrefs(local);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Налаштувати
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Віджети дашборду" description="Оберіть, що показувати на головній.">
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{g}</p>
              <div className="space-y-1">
                {DASHBOARD_WIDGETS.filter((w) => w.group === g).map((w) => {
                  const on = local[w.key];
                  return (
                    <button
                      key={w.key}
                      onClick={() => toggle(w.key)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-2"
                    >
                      <span className={cn("font-medium", on ? "text-fg" : "text-fg-subtle")}>{w.label}</span>
                      <span
                        className={cn(
                          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                          on ? "bg-primary" : "bg-border-strong",
                        )}
                      >
                        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", on ? "left-[1.125rem]" : "left-0.5")} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Не вдалося зберегти: {error}. Можливо, у БД бракує колонки dashboard_prefs.</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Скасувати</Button>
            <Button className="flex-1" loading={pending} onClick={save}>
              <Check className="h-4 w-4" /> Зберегти
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
