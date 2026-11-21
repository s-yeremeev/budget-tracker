"use client";

import dynamic from "next/dynamic";

// Графіки (recharts, ~110 KB gzip) вантажаться ОКРЕМИМ шматком після показу сторінки:
// цифри й списки з'являються одразу, а на місці графіка — заглушка тієї ж висоти
// (без стрибків верстки). На сервері графіки й так не малюються (ResponsiveContainer
// міряє ширину в браузері), тож ssr: false нічого не втрачає.
// `ssr: false` дозволено лише в клієнтському модулі — тому окремий файл, а серверні
// сторінки (дашборд) імпортують графіки звідси.

function ChartPlaceholder({ height }: { height: number }) {
  return <div aria-hidden className="w-full animate-pulse rounded-xl bg-surface-2/60" style={{ height }} />;
}

export const NetWorthChart = dynamic(() => import("./charts").then((m) => m.NetWorthChart), {
  ssr: false,
  loading: () => <ChartPlaceholder height={260} />,
});

export const DailyBarChart = dynamic(() => import("./charts").then((m) => m.DailyBarChart), {
  ssr: false,
  loading: () => <ChartPlaceholder height={260} />,
});

export const MultiLineChart = dynamic(() => import("./charts").then((m) => m.MultiLineChart), {
  ssr: false,
  loading: () => <ChartPlaceholder height={280} />,
});

export const CategoryDonut = dynamic(() => import("./charts").then((m) => m.CategoryDonut), {
  ssr: false,
  loading: () => <ChartPlaceholder height={240} />,
});
