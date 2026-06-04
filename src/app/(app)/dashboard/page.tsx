import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpenseList } from "@/components/expenses/expense-list";
import { NetWorthChart, CategoryDonut } from "@/components/charts/charts";
import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import {
  getUserId,
  getAssetsData,
  getNetWorthSeries,
  getMonthComparison,
  getRecentExpenses,
  getExpenses,
  getMonthBudgetTotal,
  getCreditsTotal,
  aggregateByCategory,
} from "@/lib/queries";
import {
  formatCurrency,
  formatMonthUk,
  monthBounds,
  percentChange,
} from "@/lib/utils";

export default async function DashboardPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const now = new Date();
  const { start, end } = monthBounds(now);

  const [{ total: assetsTotal }, series, monthCmp, recent, monthExpenses, budgetTotal, debtTotal] =
    await Promise.all([
      getAssetsData(userId),
      getNetWorthSeries(userId),
      getMonthComparison(userId, now),
      getRecentExpenses(userId, 6),
      getExpenses(userId, start, end),
      getMonthBudgetTotal(userId, now),
      getCreditsTotal(userId),
    ]);

  // Чистий капітал = активи − залишок боргів
  const netWorth = assetsTotal - debtTotal;

  const byCategory = aggregateByCategory(monthExpenses);
  const topCategory = byCategory[0] ?? null;
  const spentThisMonth = monthCmp.current;
  const change = percentChange(monthCmp.current, monthCmp.previous);

  // Net worth series → лейбли
  const nwData = series.map((s) => ({
    label: new Date(s.date).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" }),
    value: s.value,
  }));
  // Поточний Net Worth завжди показуємо як останню точку
  if (nwData.length === 0) {
    nwData.push({ label: "Сьогодні", value: netWorth });
  }

  const nwChange =
    series.length >= 2
      ? percentChange(series[series.length - 1].value, series[0].value)
      : null;

  const insights = buildInsights({
    spentThisMonth,
    prevMonth: monthCmp.previous,
    topCategory,
  });

  const donutData = byCategory.slice(0, 8).map((c) => ({
    name: c.name,
    value: c.total,
    color: c.color,
  }));

  return (
    <div className="space-y-6">
      {/* Метрики */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Чистий капітал"
          value={formatCurrency(netWorth, "UAH", { compact: netWorth > 1_000_000 })}
          icon="Landmark"
          iconColor="#6366f1"
          change={nwChange}
          positiveIsGood
          hint={
            debtTotal > 0
              ? `Активи ${formatCurrency(assetsTotal, "UAH", { compact: true })} − борги ${formatCurrency(debtTotal, "UAH", { compact: true })}`
              : "Сума всіх активів"
          }
        />
        <StatCard
          label={`Витрати · ${formatMonthUk(now)}`}
          value={formatCurrency(spentThisMonth, "UAH")}
          icon="Receipt"
          iconColor="#ef4444"
          change={change}
          positiveIsGood={false}
          hint="Порівняно з минулим місяцем"
        />
        <StatCard
          label="Найбільша категорія"
          value={topCategory ? formatCurrency(topCategory.total, "UAH") : "—"}
          icon={topCategory?.icon ?? "ChartPie"}
          iconColor={topCategory?.color ?? "#10b981"}
          hint={topCategory?.name ?? "Немає витрат цього місяця"}
        />
        {budgetTotal > 0 ? (
          <StatCard
            label="Залишок бюджету"
            value={formatCurrency(budgetTotal - spentThisMonth, "UAH")}
            icon="PiggyBank"
            iconColor={budgetTotal - spentThisMonth < 0 ? "#ef4444" : "#10b981"}
            hint={`План: ${formatCurrency(budgetTotal, "UAH")}`}
          />
        ) : (
          <StatCard
            label="Транзакцій за місяць"
            value={String(monthExpenses.length)}
            icon="ListChecks"
            iconColor="#f59e0b"
            hint={`Середня: ${
              monthExpenses.length
                ? formatCurrency(spentThisMonth / monthExpenses.length, "UAH")
                : "—"
            }`}
          />
        )}
      </div>

      {/* Інсайти */}
      {insights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((text, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-2xl border border-border bg-primary-soft/50 p-4"
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-fg">{text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Графіки */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Динаміка капіталу</CardTitle>
            <Link
              href="/assets"
              className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
            >
              Активи <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <NetWorthChart data={nwData} currency="UAH" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Витрати за категоріями</CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length ? (
              <>
                <CategoryDonut data={donutData} currency="UAH" />
                <ul className="mt-4 space-y-2">
                  {byCategory.slice(0, 4).map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="flex-1 truncate text-fg-muted">{c.name}</span>
                      <span className="font-medium text-fg">{formatCurrency(c.total, "UAH")}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState icon="ChartPie" title="Ще немає витрат" description="Додайте першу витрату цього місяця." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Останні витрати */}
      <Card>
        <CardHeader>
          <CardTitle>Останні витрати</CardTitle>
          <Link
            href="/expenses"
            className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
          >
            Усі <ChevronRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="pt-2">
          {recent.length ? (
            <ExpenseList expenses={recent} />
          ) : (
            <EmptyState
              icon="Receipt"
              title="Поки що порожньо"
              description="Додайте першу витрату, щоб почати відстеження."
              action={<AddExpenseButton />}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildInsights({
  spentThisMonth,
  prevMonth,
  topCategory,
}: {
  spentThisMonth: number;
  prevMonth: number;
  topCategory: { name: string; total: number } | null;
}): string[] {
  const out: string[] = [];
  const change = percentChange(spentThisMonth, prevMonth);
  if (change !== null && prevMonth > 0) {
    if (change > 5) {
      out.push(`Цього місяця ви витратили на ${Math.abs(change).toFixed(0)}% більше, ніж минулого.`);
    } else if (change < -5) {
      out.push(`Чудово! Витрати на ${Math.abs(change).toFixed(0)}% менші, ніж минулого місяця.`);
    } else {
      out.push("Ваші витрати приблизно на рівні минулого місяця.");
    }
  }
  if (topCategory && spentThisMonth > 0) {
    const share = (topCategory.total / spentThisMonth) * 100;
    out.push(`«${topCategory.name}» — найбільша стаття витрат: ${share.toFixed(0)}% бюджету місяця.`);
  }
  if (out.length === 0 && spentThisMonth === 0) {
    out.push("Новий місяць — чистий старт. Додайте витрати, щоб побачити аналітику.");
  }
  return out;
}
