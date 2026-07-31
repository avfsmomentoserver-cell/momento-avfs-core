import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

/** Shown whenever a panel has no data yet — never a blank rectangle. */
export function EmptyState({ icon, title, description, action, className, compact = false }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/15 text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      {icon && <div className="text-muted-foreground/50">{icon}</div>}
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      {description && <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
