import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ExpenseList } from "@/components/expenses/expense-list";
import { NetWorthChart, CategoryDonut } from "@/components/charts/charts";
import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import { DashboardCustomizer } from "@/components/dashboard/dashboard-customizer";
import { createClient } from "@/lib/supabase/server";
import {
  getUserId,
  getAssetsData,
  getNetWorthSeries,
  getMonthComparison,
  getRecentExpenses,
  getExpenses,
  getMonthBudgetTotal,
  getCreditsTotal,
  getMonthIncome,
  getGoals,
  getCredits,
  aggregateByCategory,
} from "@/lib/queries";
import { isWidgetOn } from "@/lib/dashboard-widgets";
import { getRates } from "@/lib/server/rates";
import {
  formatCurrency,
  formatMonthUk,
  monthBounds,
  percentChange,
  nextPaymentDate,
  daysUntil,
  formatDateUk,
  cn,
} from "@/lib/utils";
import type { Profile } from "@/lib/types";

export default async function DashboardPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const now = new Date();
  const { start, end } = monthBounds(now);
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("base_currency, dashboard_prefs")
    .eq("id", userId)
    .single();
  const base = (profile as Pick<Profile, "base_currency">)?.base_currency ?? "UAH";
  const prefs = (profile as Pick<Profile, "dashboard_prefs">)?.dashboard_prefs ?? null;
  const rates = await getRates(base);

  const [
    { total: assetsTotal },
    series,
    monthCmp,
    recent,
    monthExpenses,
    budgetTotal,
    debtTotal,
    incomeCmp,
    goals,
    credits,
  ] = await Promise.all([
    getAssetsData(userId, base, rates),
    getNetWorthSeries(userId),
    getMonthComparison(userId, now, base, rates),
    getRecentExpenses(userId, 6),
    getExpenses(userId, start, end),
    getMonthBudgetTotal(userId, now, base, rates),
    getCreditsTotal(userId, base, rates),
    getMonthIncome(userId, now, base, rates),
    getGoals(userId),
    getCredits(userId),
  ]);

  const show = (k: string) => isWidgetOn(prefs, k);

  const netWorth = assetsTotal - debtTotal;
  const monthIncome = incomeCmp.current;
  const balance = monthIncome - monthCmp.current;
  const incomeChange = percentChange(incomeCmp.current, incomeCmp.previous);
  const savingsRate = monthIncome > 0 ? (balance / monthIncome) * 100 : null;

  const byCategory = aggregateByCategory(monthExpenses, base, rates);
  const topCategory = byCategory[0] ?? null;
  const spentThisMonth = monthCmp.current;
  const change = percentChange(monthCmp.current, monthCmp.previous);

  const nwData = series.map((s) => ({
    label: new Date(s.date).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" }),
    value: s.value,
  }));
  if (nwData.length === 0) nwData.push({ label: "Сьогодні", value: netWorth });

  const nwChange =
    series.length >= 2 ? percentChange(series[series.length - 1].value, series[0].value) : null;

  const insights = buildInsights({ spentThisMonth, prevMonth: monthCmp.previous, topCategory });
  const donutData = byCategory.slice(0, 8).map((c) => ({ name: c.name, value: c.total, color: c.color }));

  // Найближчі платежі по кредитах (з заданим днем платежу)
  const upcoming = credits
    .filter((c) => c.payment_day && Number(c.remaining_amount) > 0)
    .map((c) => ({ c, date: nextPaymentDate(c.payment_day as number) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  // Метрики (гейтовані)
  const metricCards = [
    show("m_networth") && (
      <StatCard
        key="nw"
        label="Чистий капітал"
        value={formatCurrency(netWorth, base, { compact: netWorth > 1_000_000 })}
        icon="Landmark"
        iconColor="#6366f1"
        change={nwChange}
        positiveIsGood
        hint={
          debtTotal > 0
            ? `Активи ${formatCurrency(assetsTotal, base, { compact: true })} − борги ${formatCurrency(debtTotal, base, { compact: true })}`
            : "Сума всіх активів"
        }
      />
    ),
    show("m_income") && (
      <StatCard key="inc" label={`Доходи · ${formatMonthUk(now)}`} value={formatCurrency(monthIncome, base)} icon="Banknote" iconColor="#10b981" change={incomeChange} positiveIsGood hint="Порівняно з минулим місяцем" />
    ),
    show("m_expenses") && (
      <StatCard key="exp" label={`Витрати · ${formatMonthUk(now)}`} value={formatCurrency(spentThisMonth, base)} icon="Receipt" iconColor="#ef4444" change={change} positiveIsGood={false} hint="Порівняно з минулим місяцем" />
    ),
    show("m_balance") && (
      <StatCard key="bal" label="Баланс місяця" value={formatCurrency(balance, base, { sign: true })} icon="Scale" iconColor={balance >= 0 ? "#10b981" : "#ef4444"} hint={savingsRate !== null ? `Норма заощаджень: ${savingsRate.toFixed(0)}%` : "Дохід − витрати за місяць"} />
    ),
    show("m_topcat") && (
      <StatCard key="top" label="Найбільша категорія" value={topCategory ? formatCurrency(topCategory.total, base) : "—"} icon={topCategory?.icon ?? "ChartPie"} iconColor={topCategory?.color ?? "#10b981"} hint={topCategory?.name ?? "Немає витрат цього місяця"} />
    ),
    show("m_budget") &&
      (budgetTotal > 0 ? (
        <StatCard key="bud" label="Залишок бюджету" value={formatCurrency(budgetTotal - spentThisMonth, base)} icon="PiggyBank" iconColor={budgetTotal - spentThisMonth < 0 ? "#ef4444" : "#10b981"} hint={`План: ${formatCurrency(budgetTotal, base)}`} />
      ) : (
        <StatCard key="tx" label="Транзакцій за місяць" value={String(monthExpenses.length)} icon="ListChecks" iconColor="#f59e0b" hint={`Середня: ${monthExpenses.length ? formatCurrency(spentThisMonth / monthExpenses.length, base) : "—"}`} />
      )),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">{formatMonthUk(now)}</p>
        <DashboardCustomizer prefs={prefs} />
      </div>

      {/* Метрики */}
      {metricCards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{metricCards}</div>
      )}

      {/* Інсайти */}
      {show("insights") && insights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((text, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-2xl border border-border bg-primary-soft/50 p-4">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-fg">{text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Графіки */}
      {(show("networth_chart") || show("category_donut")) && (
        <div className="grid gap-6 lg:grid-cols-5">
          {show("networth_chart") && (
            <Card className={show("category_donut") ? "lg:col-span-3" : "lg:col-span-5"}>
              <CardHeader>
                <CardTitle>Динаміка капіталу</CardTitle>
                <Link href="/assets" className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
                  Активи <ChevronRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent>
                <NetWorthChart data={nwData} currency={base} />
              </CardContent>
            </Card>
          )}

          {show("category_donut") && (
            <Card className={show("networth_chart") ? "lg:col-span-2" : "lg:col-span-5"}>
              <CardHeader>
                <CardTitle>Витрати за категоріями</CardTitle>
              </CardHeader>
              <CardContent>
                {donutData.length ? (
                  <>
                    <CategoryDonut data={donutData} currency={base} />
                    <ul className="mt-4 space-y-2">
                      {byCategory.slice(0, 4).map((c) => (
                        <li key={c.id} className="flex items-center gap-2 text-sm">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                          <span className="flex-1 truncate text-fg-muted">{c.name}</span>
                          <span className="font-medium text-fg">{formatCurrency(c.total, base)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <EmptyState icon="ChartPie" title="Ще немає витрат" description="Додайте першу витрату цього місяця." />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Цілі + Кредити */}
      {((show("goals") && goals.length > 0) || (show("credits") && credits.length > 0)) && (
        <div className="grid gap-6 md:grid-cols-2">
          {show("goals") && goals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Фінансові цілі</CardTitle>
                <Link href="/goals" className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
                  Усі <ChevronRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {goals.slice(0, 3).map((g) => {
                  const cur = g.asset_id ? Number(g.asset?.value ?? 0) : Number(g.current_amount);
                  const pct = Number(g.target_amount) > 0 ? Math.min((cur / Number(g.target_amount)) * 100, 100) : 0;
                  return (
                    <div key={g.id}>
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: g.color + "22", color: g.color }}>
                          <Icon name={g.icon} className="h-4 w-4" />
                        </span>
                        <span className="flex-1 truncate font-medium text-fg">{g.name}</span>
                        <span className="text-xs text-fg-subtle">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? "var(--success)" : g.color }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {show("credits") && credits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Кредити</CardTitle>
                <Link href="/credits" className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
                  Усі <ChevronRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <p className="text-sm text-fg-muted">
                  Загальний борг: <span className="font-semibold text-danger">{formatCurrency(debtTotal, base)}</span>
                </p>
                {credits.slice(0, 3).map((c) => {
                  const total = Number(c.total_amount);
                  const remaining = Number(c.remaining_amount);
                  const pct = total > 0 ? Math.min(((total - remaining) / total) * 100, 100) : 0;
                  return (
                    <div key={c.id}>
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate font-medium text-fg">{c.name}</span>
                        <span className="text-xs text-fg-subtle">{formatCurrency(remaining, c.currency)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Найближчі платежі */}
      {show("upcoming") && upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Найближчі платежі</CardTitle>
            <Link href="/credits" className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
              Кредити <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="divide-y divide-border">
              {upcoming.map(({ c, date }) => {
                const left = daysUntil(date);
                const soon = left <= 5;
                return (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
                      <Icon name="CreditCard" className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                      <p className="truncate text-xs text-fg-subtle">{c.lender} · {formatDateUk(date)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-fg">{formatCurrency(Number(c.monthly_payment), c.currency)}</p>
                      <p className={cn("text-xs", soon ? "text-warning" : "text-fg-subtle")}>
                        {left === 0 ? "сьогодні" : left === 1 ? "завтра" : `через ${left} дн.`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Останні витрати */}
      {show("recent") && (
        <Card>
          <CardHeader>
            <CardTitle>Останні витрати</CardTitle>
            <Link href="/expenses" className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
              Усі <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            {recent.length ? (
              <ExpenseList expenses={recent} />
            ) : (
              <EmptyState icon="Receipt" title="Поки що порожньо" description="Додайте першу витрату, щоб почати відстеження." action={<AddExpenseButton />} />
            )}
          </CardContent>
        </Card>
      )}
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
    if (change > 5) out.push(`Цього місяця ви витратили на ${Math.abs(change).toFixed(0)}% більше, ніж минулого.`);
    else if (change < -5) out.push(`Чудово! Витрати на ${Math.abs(change).toFixed(0)}% менші, ніж минулого місяця.`);
    else out.push("Ваші витрати приблизно на рівні минулого місяця.");
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
