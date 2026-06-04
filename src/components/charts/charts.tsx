"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/utils";

const AXIS = "var(--fg-subtle)";
const GRID = "var(--border)";

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated px-3 py-2 text-xs shadow-lg">
      {children}
    </div>
  );
}

/* ---------- Net Worth (area) ---------- */
export function NetWorthChart({
  data,
  currency,
}: {
  data: { label: string; value: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis
          tick={{ fill: AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v) => formatNumber(v, true)}
        />
        <Tooltip
          cursor={{ stroke: GRID }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipBox>
                <p className="text-fg-subtle">{label}</p>
                <p className="font-semibold text-fg">
                  {formatCurrency(Number(payload[0].value), currency)}
                </p>
              </TooltipBox>
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#nwFill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- Витрати по днях (bar) ---------- */
export function DailyBarChart({
  data,
  currency,
}: {
  data: { label: string; amount: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
        <YAxis
          tick={{ fill: AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v) => formatNumber(v, true)}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipBox>
                <p className="text-fg-subtle">{label}</p>
                <p className="font-semibold text-fg">
                  {formatCurrency(Number(payload[0].value), currency)}
                </p>
              </TooltipBox>
            ) : null
          }
        />
        <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Динаміка кількох категорій по місяцях (multi-line) ---------- */
export function MultiLineChart({
  data,
  series,
  currency,
}: {
  data: Record<string, number | string>[];
  series: { key: string; name: string; color: string }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={12} />
        <YAxis
          tick={{ fill: AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v) => formatNumber(v, true)}
        />
        <Tooltip
          cursor={{ stroke: GRID }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const rows = [...payload]
              .filter((p) => Number(p.value) > 0)
              .sort((a, b) => Number(b.value) - Number(a.value));
            if (!rows.length) return null;
            return (
              <TooltipBox>
                <p className="mb-1 font-medium text-fg">{label}</p>
                <div className="space-y-0.5">
                  {rows.map((p) => (
                    <p key={p.name} className="flex items-center gap-2 text-fg-muted">
                      <span className="h-2 w-2 rounded-full" style={{ background: p.color as string }} />
                      <span className="flex-1">{p.name}</span>
                      <span className="font-medium text-fg">{formatCurrency(Number(p.value), currency)}</span>
                    </p>
                  ))}
                </div>
              </TooltipBox>
            );
          }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ---------- Розподіл за категоріями (donut) ---------- */
export function CategoryDonut({
  data,
  currency,
}: {
  data: { name: string; value: number; color: string }[];
  currency: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox>
                  <p className="font-medium text-fg">{payload[0].name}</p>
                  <p className="text-fg-muted">
                    {formatCurrency(Number(payload[0].value), currency)} ·{" "}
                    {total ? ((Number(payload[0].value) / total) * 100).toFixed(0) : 0}%
                  </p>
                </TooltipBox>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-fg-subtle">Усього</span>
        <span className="text-lg font-bold text-fg">{formatCurrency(total, currency, { compact: true })}</span>
      </div>
    </div>
  );
}
