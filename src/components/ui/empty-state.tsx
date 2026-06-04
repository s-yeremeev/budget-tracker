import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

interface Props {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-fg-subtle">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <p className="mt-4 font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
