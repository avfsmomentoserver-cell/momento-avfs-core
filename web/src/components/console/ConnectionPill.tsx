import { Activity, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { usePlatform } from "@/state/PlatformProvider";

/** Live-link indicator: socket state plus the age of the last update. */
export function ConnectionPill({ className }: { className?: string }) {
  const { connected, isLive, lastUpdated } = usePlatform();

  const tone = isLive ? "signal" : connected ? "caution" : "critical";
  const text = isLive ? "LIVE" : connected ? "LINKED" : "OFFLINE";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
        tone === "signal" && "border-signal/40 bg-signal/10 text-signal",
        tone === "caution" && "border-caution/40 bg-caution/10 text-caution",
        tone === "critical" && "border-critical/40 bg-critical/10 text-critical",
        className,
      )}
      title={connected ? "WebSocket connected" : "WebSocket disconnected — polling fallback active"}
    >
      {connected ? (
        <span className={cn("relative flex h-1.5 w-1.5")}>
          <span className={cn("absolute inline-flex h-full w-full rounded-full bg-current", isLive && "animate-ping opacity-60")} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span>{text}</span>
      {lastUpdated && (
        <>
          <span className="text-current/40">·</span>
          <span className="font-normal normal-case tracking-normal text-current/70">{relativeTime(lastUpdated.toISOString())}</span>
        </>
      )}
      {!lastUpdated && connected && <Activity className="h-3 w-3 animate-pulse" />}
    </div>
  );
}
