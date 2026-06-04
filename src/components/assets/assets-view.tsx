"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { NetWorthChart } from "@/components/charts/charts";
import { AssetForm } from "@/components/assets/asset-form";
import { deleteAsset } from "@/lib/actions/assets";
import { useApp } from "@/components/app/app-shell";
import { convert } from "@/lib/currency";
import { formatCurrency, percentChange, cn } from "@/lib/utils";
import type { Asset, AssetCategory } from "@/lib/types";

interface Props {
  assets: Asset[];
  categories: AssetCategory[];
  total: number;
  series: { date: string; value: number }[];
}

export function AssetsView({ assets, categories, total, series }: Props) {
  const router = useRouter();
  const { currency: base, rates } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [presetCat, setPresetCat] = useState<string | null>(null);

  function add(categoryId?: string) {
    setEditing(null);
    setPresetCat(categoryId ?? null);
    setOpen(true);
  }
  function edit(asset: Asset) {
    setEditing(asset);
    setPresetCat(null);
    setOpen(true);
  }

  const nwData = series.map((s) => ({
    label: new Date(s.date).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" }),
    value: s.value,
  }));
  if (nwData.length === 0) nwData.push({ label: "Сьогодні", value: total });
  const nwChange =
    series.length >= 2 ? percentChange(series[series.length - 1].value, series[0].value) : null;

  return (
    <div className="space-y-6">
      {/* Net Worth header */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-fg-muted">Чистий капітал</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-fg">
                {formatCurrency(total, base)}
              </p>
              {nwChange !== null && (
                <p className={cn("mt-1 flex items-center gap-1 text-sm font-medium", nwChange >= 0 ? "text-success" : "text-danger")}>
                  <TrendingUp className="h-4 w-4" />
                  {nwChange >= 0 ? "+" : ""}
                  {nwChange.toFixed(1)}% за період
                </p>
              )}
            </div>
            <Button onClick={() => add()}>
              <Plus className="h-4 w-4" /> Додати актив
            </Button>
          </div>
          <div className="mt-4">
            <NetWorthChart data={nwData} currency={base} />
          </div>
        </CardContent>
      </Card>

      {/* Категорії активів */}
      {assets.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              icon="Landmark"
              title="Додайте перший актив"
              description="Інвестиції, заощадження, баланси карток — усе в одному місці."
              action={
                <Button onClick={() => add()}>
                  <Plus className="h-4 w-4" /> Додати актив
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {categories.map((cat) => {
        const items = assets.filter((a) => a.category_id === cat.id);
        if (items.length === 0) return null;
        const catTotal = items.reduce((s, a) => s + convert(Number(a.value), a.currency, base, rates), 0);
        const share = total ? (catTotal / total) * 100 : 0;
        return (
          <Card key={cat.id}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: cat.color + "22", color: cat.color }}
                >
                  <Icon name={cat.icon} className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle>{cat.name}</CardTitle>
                  <p className="text-xs text-fg-subtle">{share.toFixed(0)}% капіталу</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-fg">{formatCurrency(catTotal, base)}</p>
                <button
                  onClick={() => add(cat.id)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  + Додати
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ul className="divide-y divide-border">
                {items.map((a) => (
                  <AssetRow key={a.id} asset={a} onEdit={() => edit(a)} />
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      {/* Активи без категорії */}
      {(() => {
        const orphans = assets.filter(
          (a) => !a.category_id || !categories.some((c) => c.id === a.category_id),
        );
        if (orphans.length === 0) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle>Інше</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ul className="divide-y divide-border">
                {orphans.map((a) => (
                  <AssetRow key={a.id} asset={a} onEdit={() => edit(a)} />
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })()}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Редагувати актив" : "Новий актив"}
      >
        <AssetForm
          categories={categories}
          asset={editing}
          defaultCategoryId={presetCat}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}

function AssetRow({ asset, onEdit }: { asset: Asset; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function remove() {
    startTransition(async () => {
      await deleteAsset(asset.id);
      router.refresh();
    });
  }

  return (
    <li className={cn("group flex items-center gap-3 py-3", pending && "opacity-40")}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{asset.name}</p>
        <p className="text-xs text-fg-subtle">{asset.currency}</p>
      </div>
      <span className="text-sm font-semibold text-fg">
        {formatCurrency(Number(asset.value), asset.currency)}
      </span>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {confirming ? (
          <div className="flex items-center gap-1">
            <button onClick={remove} className="rounded-lg bg-danger px-2 py-1 text-xs font-medium text-white">
              Видалити
            </button>
            <button onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1 text-xs text-fg-muted hover:bg-surface-2">
              Ні
            </button>
          </div>
        ) : (
          <>
            <button onClick={onEdit} className="rounded-lg p-2 text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label="Редагувати">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setConfirming(true)} className="rounded-lg p-2 text-fg-subtle hover:bg-danger-soft hover:text-danger" aria-label="Видалити">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
