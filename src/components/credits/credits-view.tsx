"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CreditCard, CircleCheckBig } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { CreditForm } from "@/components/credits/credit-form";
import { deleteCredit, addCreditPayment } from "@/lib/actions/credits";
import { formatCurrency, cn } from "@/lib/utils";
import type { Credit } from "@/lib/types";

export function CreditsView({ credits }: { credits: Credit[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Credit | null>(null);

  const totalDebt = credits.reduce((s, c) => s + Number(c.remaining_amount), 0);
  const totalMonthly = credits
    .filter((c) => Number(c.remaining_amount) > 0)
    .reduce((s, c) => s + Number(c.monthly_payment), 0);
  const currency = credits[0]?.currency ?? "UAH";

  function add() {
    setEditing(null);
    setOpen(true);
  }
  function edit(c: Credit) {
    setEditing(c);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Зведення */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-8">
              <div>
                <p className="text-sm text-fg-muted">Загальний борг</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-danger">
                  {formatCurrency(totalDebt, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-fg-muted">Платежі / міс</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-fg">
                  {formatCurrency(totalMonthly, currency)}
                </p>
              </div>
            </div>
            <Button onClick={add}>
              <Plus className="h-4 w-4" /> Додати кредит
            </Button>
          </div>
        </CardContent>
      </Card>

      {credits.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon="CreditCard"
              title="Немає активних кредитів"
              description="Додай кредит, щоб бачити залишок, платежі та реальний чистий капітал."
              action={
                <Button onClick={add}>
                  <Plus className="h-4 w-4" /> Додати кредит
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {credits.map((c) => (
            <CreditCardItem key={c.id} credit={c} onEdit={() => edit(c)} />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Редагувати кредит" : "Новий кредит"}>
        <CreditForm credit={editing} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  );
}

function CreditCardItem({ credit, onEdit }: { credit: Credit; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [payment, setPayment] = useState("");

  const total = Number(credit.total_amount);
  const remaining = Number(credit.remaining_amount);
  const paid = Math.max(total - remaining, 0);
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  const done = remaining <= 0;

  function pay(amount: number) {
    if (!amount || amount <= 0) return;
    startTransition(async () => {
      await addCreditPayment(credit.id, amount);
      setPayment("");
      router.refresh();
    });
  }
  function remove() {
    startTransition(async () => {
      await deleteCredit(credit.id);
      router.refresh();
    });
  }

  return (
    <Card className={cn("transition-opacity", pending && "opacity-50")}>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
            <CreditCard className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-semibold text-fg">{credit.name}</p>
              {done && <CircleCheckBig className="h-4 w-4 shrink-0 text-success" />}
            </div>
            <p className="truncate text-xs text-fg-subtle">{credit.lender}</p>
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

        {/* Прогрес погашення */}
        <div>
          <div className="mb-1.5 flex items-end justify-between">
            <span className="text-lg font-bold text-fg">{formatCurrency(remaining, credit.currency)}</span>
            <span className="text-sm text-fg-subtle">з {formatCurrency(total, credit.currency)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-fg-muted">
              {done ? "Погашено! 🎉" : `Сплачено ${pct.toFixed(0)}%`}
            </span>
            {credit.monthly_payment > 0 && !done && (
              <span className="text-fg-subtle">
                платіж {formatCurrency(Number(credit.monthly_payment), credit.currency)}/міс
              </span>
            )}
          </div>
        </div>

        {/* Запис платежу */}
        {!done && (
          <div className="flex gap-2 pt-1">
            <Input
              inputMode="decimal"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              placeholder="Сума платежу"
              className="h-9 flex-1"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => pay(parseFloat(payment.replace(",", ".")) || 0)}
            >
              Записати
            </Button>
            {credit.monthly_payment > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => pay(Number(credit.monthly_payment))}
                title="Внести щомісячний платіж"
              >
                +{formatCurrency(Number(credit.monthly_payment), credit.currency, { compact: true })}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
