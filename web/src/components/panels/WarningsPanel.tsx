import { AlertTriangle, ShieldCheck } from "lucide-react";

import { Panel } from "@/components/console/Panel";
import { cn } from "@/lib/utils";
import type { WarningEntry } from "@/lib/types";

const LEVEL_STYLE: Record<WarningEntry["level"], string> = {
  high: "border-critical/35 bg-critical/10 text-critical",
  medium: "border-caution/35 bg-caution/10 text-caution",
  low: "border-info/30 bg-info/8 text-info",
};

/** Operator warnings, highest severity first. */
export function WarningsPanel({ warnings }: { warnings: WarningEntry[] }) {
  return (
    <Panel title="Warnings" subtitle={`${warnings.length} active`} icon={<AlertTriangle className="h-3.5 w-3.5" />}>
      {warnings.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-md border border-signal/25 bg-signal/8 px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-signal" />
          <p className="text-xs text-signal/90">No active warnings. Structure looks clean.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {warnings.map((warning) => (
            <li key={`${warning.code}-${warning.message}`} className={cn("rounded-md border px-3 py-2", LEVEL_STYLE[warning.level])}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em]">{warning.level}</span>
                <span className="font-mono text-[9px] text-current/60">{warning.code}</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-foreground/85">{warning.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
