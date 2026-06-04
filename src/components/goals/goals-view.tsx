"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CircleCheckBig, CalendarClock, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { GoalForm } from "@/components/goals/goal-form";
import { deleteGoal, addGoalContribution } from "@/lib/actions/goals";
import { formatCurrency, formatDateUk, cn } from "@/lib/utils";
import type { Goal, GoalWithAsset } from "@/lib/types";

export function GoalsView({ goals }: { goals: GoalWithAsset[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  function add() {
    setEditing(null);
    setOpen(true);
  }
  function edit(g: Goal) {
    setEditing(g);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          {goals.length ? `${goals.length} ${plural(goals.length)}` : "Постав ціль і відстежуй прогрес"}
        </p>
        <Button onClick={add}>
          <Plus className="h-4 w-4" /> Нова ціль
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon="Target"
              title="Ще немає цілей"
              description="Накопич на відпустку, техніку чи резерв — з наочним прогресом."
              action={
                <Button onClick={add}>
                  <Plus className="h-4 w-4" /> Створити ціль
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onEdit={() => edit(g)} />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Редагувати ціль" : "Нова ціль"}>
        <GoalForm goal={editing} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  );
}

function GoalCard({ goal, onEdit }: { goal: GoalWithAsset; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const linked = !!goal.asset_id;
  const current = linked ? Number(goal.asset?.value ?? 0) : Number(goal.current_amount);
  const target = Number(goal.target_amount);
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = Math.max(target - current, 0);
  const achieved = current >= target;

  // Підказка щодо щомісячного відкладання
  let monthlyHint: string | null = null;
  let deadlineHint: string | null = null;
  if (goal.target_date) {
    const today = new Date();
    const dl = new Date(goal.target_date + "T00:00:00");
    const days = Math.ceil((dl.getTime() - today.getTime()) / 86400000);
    deadlineHint = formatDateUk(goal.target_date);
    if (!achieved && days > 0) {
      const months = Math.max(days / 30.44, 0.1);
      monthlyHint = `${formatCurrency(remaining / months, goal.currency, { compact: remaining / months > 100000 })}/міс`;
    } else if (!achieved && days <= 0) {
      deadlineHint += " · протерміновано";
    }
  }

  function contribute(delta: number) {
    startTransition(async () => {
      await addGoalContribution(goal.id, delta);
      router.refresh();
    });
  }
  function remove() {
    startTransition(async () => {
      await deleteGoal(goal.id);
      router.refresh();
    });
  }

  return (
    <Card className={cn("transition-opacity", pending && "opacity-50")}>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: goal.color + "22", color: goal.color }}
          >
            <Icon name={goal.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-semibold text-fg">{goal.name}</p>
              {achieved && <CircleCheckBig className="h-4 w-4 shrink-0 text-success" />}
            </div>
            <p className="flex items-center gap-2 text-xs text-fg-subtle">
              {linked && (
                <span className="inline-flex items-center gap-0.5">
                  <Link2 className="h-3 w-3" /> повʼязано з активом
                </span>
              )}
              {deadlineHint && (
                <span className="inline-flex items-center gap-0.5">
                  <CalendarClock className="h-3 w-3" /> {deadlineHint}
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button onClick={onEdit} className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label="Редагувати">
              <Pencil className="h-4 w-4" />
            </button>
            {confirming ? (
              <button onClick={remove} className="rounded-lg bg-danger px-2 text-xs font-medium text-white">
                Видалити
              </button>
            ) : (
              <button onClick={() => setConfirming(true)} className="rounded-lg p-1.5 text-fg-subtle hover:bg-danger-soft hover:text-danger" aria-label="Видалити">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Прогрес */}
        <div>
          <div className="mb-1.5 flex items-end justify-between">
            <span className="text-lg font-bold text-fg">{formatCurrency(current, goal.currency)}</span>
            <span className="text-sm text-fg-subtle">з {formatCurrency(target, goal.currency)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: achieved ? "var(--success)" : goal.color }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className={cn("font-medium", achieved ? "text-success" : "text-fg-muted")}>
              {achieved ? "Ціль досягнута! 🎉" : `${pct.toFixed(0)}% · лишилось ${formatCurrency(remaining, goal.currency)}`}
            </span>
            {monthlyHint && <span className="font-medium text-primary">{monthlyHint}</span>}
          </div>
        </div>

        {/* Внески — лише для ручних цілей */}
        {!linked && !achieved && (
          <div className="flex gap-2 pt-1">
            {[100, 500, 1000].map((v) => (
              <button
                key={v}
                onClick={() => contribute(v)}
                className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-primary hover:text-primary"
              >
                +{v}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function plural(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "ціль";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "цілі";
  return "цілей";
}
