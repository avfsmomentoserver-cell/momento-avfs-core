import { useQuery } from "@tanstack/react-query";
import { Dna, Loader2, Search } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { Ring } from "@/components/console/Ring";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { decimal, integer, multiplier, multiplierColor, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/state/PlatformProvider";

/**
 * DNA Hunter: encodes the recent window as a band signature, finds historical
 * windows that match, and reports what actually happened next.
 */
export default function DnaHunter() {
  const { source } = usePlatform();
  const [tolerance, setTolerance] = useState<number>(0.85);
  const [windowSize, setWindowSize] = useState<number>(8);

  const dnaQuery = useQuery({
    queryKey: ["dna", source, tolerance, windowSize],
    queryFn: () => api.dna(source, tolerance, windowSize, "file"),
    refetchInterval: POLL.slow,
  });

  const report = dnaQuery.data?.report;
  const outcomes = report?.outcomes ?? {};

  return (
    <AppShell title="DNA Hunter" subtitle="Analogue matching over band signatures">
      <div className="space-y-4">
        <Panel title="Signature Matching" subtitle="tune the window and similarity threshold" icon={<Search className="h-3.5 w-3.5" />} lit>
          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <Ring
              value={report?.confidence ?? 0}
              size={168}
              thickness={11}
              label={integer(report?.match_count)}
              sublabel="analogues found"
            />

            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Similarity threshold</Label>
                    <span className="font-mono text-xs tabular-nums text-signal">{percent(tolerance, 0)}</span>
                  </div>
                  <Slider value={[tolerance]} onValueChange={([value]) => setTolerance(value)} min={0.5} max={0.99} step={0.01} />
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Higher values demand near-identical band sequences and return fewer, stronger analogues.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Window size</Label>
                    <span className="font-mono text-xs tabular-nums text-signal">{windowSize} rounds</span>
                  </div>
                  <Slider value={[windowSize]} onValueChange={([value]) => setWindowSize(value)} min={4} max={20} step={1} />
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    The number of trailing rounds encoded into the signature that gets matched.
                  </p>
                </div>
              </div>

              {report?.signature && report.signature.length > 0 && (
                <div>
                  <p className="hud-label mb-2">Current signature</p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.signature.map((band, index) => (
                      <span
                        key={`${index}-${band}`}
                        className="rounded border border-border/60 bg-muted/30 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground/80"
                      >
                        {band}
                      </span>
                    ))}
                  </div>
                  {report.signature_labels && (
                    <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">{report.signature_labels.join(" → ")}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile label="Matches" value={integer(report?.match_count)} accent="signal" hint={`of ${integer(dnaQuery.data?.samples)} rounds scanned`} />
          <StatTile label="Median follow-up" value={multiplier(outcomes.median)} accent="info" hint={`mean ${multiplier(outcomes.mean)}`} />
          <StatTile
            label="Went 2x+"
            value={percent(outcomes.over_2x, 1)}
            accent="caution"
            progress={outcomes.over_2x ?? 0}
            hint="share of analogues followed by 2x or better"
          />
          <StatTile
            label="Went 5x+"
            value={percent(outcomes.over_5x, 1)}
            accent="signal"
            progress={outcomes.over_5x ?? 0}
            hint="share of analogues followed by 5x or better"
          />
          <StatTile
            label="Went 10x+"
            value={percent(outcomes.over_10x, 1)}
            accent="violet"
            progress={outcomes.over_10x ?? 0}
            hint={`p90 follow-up ${multiplier(outcomes.p90)}`}
          />
        </div>

        <Panel
          title="Matched Analogues"
          subtitle={report?.note ?? `similarity ≥ ${percent(tolerance, 0)}`}
          icon={<Dna className="h-3.5 w-3.5" />}
          actions={
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => void dnaQuery.refetch()}>
              Rescan
            </Button>
          }
          bodyClassName="p-0"
        >
          {dnaQuery.isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !report || report.matches.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No analogues at this threshold"
                description="Lower the similarity threshold or ingest more history — DNA matching needs roughly three windows of data."
              />
            </div>
          ) : (
            <div className="no-scrollbar max-h-[440px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-card/95 backdrop-blur">
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">#</th>
                    <th className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Signature</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Similarity</th>
                    <th className="px-2 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Next</th>
                    <th className="px-4 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {report.matches.map((match, index) => (
                    <tr key={`${match.index}-${index}`} className="border-b border-border/25 hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono text-[10px] tabular-nums text-muted-foreground/60">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {match.signature.map((band, bandIndex) => (
                            <span
                              key={`${bandIndex}-${band}`}
                              className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
                            >
                              {band}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full bg-signal"
                              style={{ width: `${((match.similarity - 0.5) / 0.5) * 100}%` }}
                            />
                          </span>
                          <span className="font-mono text-[11px] tabular-nums">{percent(match.similarity, 1)}</span>
                        </div>
                      </td>
                      <td
                        className="px-2 py-2 text-right font-mono text-xs font-semibold tabular-nums"
                        style={{ color: multiplierColor(match.next_multiplier) }}
                      >
                        {multiplier(match.next_multiplier)}
                      </td>
                      <td className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground">{match.next_band}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {report && report.matches.length > 0 && (
          <Panel title="Follow-up Distribution" subtitle="what happened immediately after each analogue">
            <div className="flex h-40 items-end gap-1">
              {report.matches.map((match, index) => {
                const height = Math.min(100, (Math.log2(Math.max(1, match.next_multiplier)) / 7) * 100);
                return (
                  <span
                    key={index}
                    className={cn("flex-1 rounded-t-sm transition-all")}
                    style={{
                      height: `${Math.max(4, height)}%`,
                      backgroundColor: multiplierColor(match.next_multiplier),
                      opacity: 0.5 + match.similarity * 0.5,
                    }}
                    title={`${multiplier(match.next_multiplier)} · ${percent(match.similarity, 1)} similar`}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/50 pt-3">
              <span className="chip-muted">count {integer(outcomes.count)}</span>
              <span className="chip-muted">median {multiplier(outcomes.median)}</span>
              <span className="chip-muted">p75 {multiplier(outcomes.p75)}</span>
              <span className="chip-muted">p90 {multiplier(outcomes.p90)}</span>
              <span className="chip-muted">tolerance {decimal(report.tolerance, 2)}</span>
            </div>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
