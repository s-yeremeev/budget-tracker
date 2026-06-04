import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  iconColor?: string;
  /** Зміна у %, якщо є. */
  change?: number | null;
  /** Чи добре, коли значення зростає (для кольору тренду). */
  positiveIsGood?: boolean;
  hint?: string;
}

export function StatCard({
  label,
  value,
  icon,
  iconColor = "#6366f1",
  change,
  positiveIsGood = true,
  hint,
}: StatCardProps) {
  const hasChange = change !== null && change !== undefined && isFinite(change);
  const up = (change ?? 0) >= 0;
  const good = up === positiveIsGood;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconColor + "1f", color: iconColor }}
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>
        {hasChange && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-semibold",
              good ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(change!).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-fg-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
