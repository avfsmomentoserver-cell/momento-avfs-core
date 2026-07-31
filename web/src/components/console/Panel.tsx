import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PanelProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  lit?: boolean;
  dense?: boolean;
}

/** The standard instrument panel: hairline border, label row, content well. */
export function Panel({
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
  bodyClassName,
  lit = false,
  dense = false,
}: PanelProps) {
  return (
    <section className={cn("panel flex flex-col", lit && "panel-lit", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <span className="shrink-0 text-signal/80">{icon}</span>}
            <div className="min-w-0">
              {title && <h2 className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/90">{title}</h2>}
              {subtitle && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={cn("flex-1", dense ? "p-3" : "p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
