import { useQuery } from "@tanstack/react-query";
import { Fingerprint, Languages, Loader2 } from "lucide-react";
import { useState } from "react";

import { BandDistribution } from "@/components/charts/BandDistribution";
import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { StateBadge } from "@/components/console/StateBadge";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { decimal, multiplier, percent } from "@/lib/format";
import { usePlatform } from "@/state/PlatformProvider";

/** MomentoLinguistics: the shared vocabulary every engine speaks. */
export default function Linguistics() {
  const { source, analysis } = usePlatform();
  const [probe, setProbe] = useState<string>("4.20");

  const linguisticsQuery = useQuery({
    queryKey: ["linguistics", source],
    queryFn: () => api.linguistics(source),
    refetchInterval: POLL.analysis,
  });

  const parsed = Number.parseFloat(probe);
  const probeValue = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;

  const explainQuery = useQuery({
    queryKey: ["explain", probeValue],
    queryFn: () => api.explain(probeValue),
    staleTime: 60000,
  });

  const data = linguisticsQuery.data;
  const explain = explainQuery.data;

  return (
    <AppShell title="MomentoLinguistics" subtitle="Eight semantic layers: bands, energy, shape, state and narrative">
      <div className="space-y-4">
        <Panel title="Current Reading" subtitle="the platform's plain-language description of the tape" icon={<Languages className="h-3.5 w-3.5" />} lit>
          {!data ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StateBadge state={data.current.state} size="lg" pulse />
                <span className="chip-info">shape: {data.current.shape}</span>
                <span className="chip-muted">band: {analysis?.latest.band ?? "—"}</span>
                <span className="chip-muted">energy: {analysis?.latest.energy ?? "—"}</span>
              </div>
              <p className="rounded-md border border-signal/20 bg-signal/6 px-4 py-3 text-sm leading-relaxed text-foreground/90">
                {data.current.narrative}
              </p>
            </div>
          )}
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Last multiplier" value={multiplier(analysis?.latest.multiplier)} accent="signal" hint={`${analysis?.latest.band ?? "—"} band`} />
          <StatTile label="Point value" value={decimal(analysis?.latest.points, 1)} accent="info" hint="100 pts = 1.00x · +30 pts per doubling" />
          <StatTile label="Energy" value={(analysis?.latest.energy ?? "—").toUpperCase()} accent="caution" hint="layer 3 release descriptor" />
          <StatTile label="Shape" value={(data?.current.shape ?? "—").toUpperCase()} accent="violet" hint="layer 4 window topology" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Band Vocabulary" subtitle="layer 1 · the shared multiplier taxonomy" bodyClassName="p-0">
            {!data ? (
              <div className="p-4">
                <EmptyState compact title="Loading vocabulary" />
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Band</th>
                    <th className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Range</th>
                    <th className="px-4 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bands.map((band) => {
                    const histogram = analysis?.band_histogram.find((entry) => entry.band === band.key);
                    const isCurrent = analysis?.latest.band === band.label;
                    return (
                      <tr key={band.key} className={isCurrent ? "border-b border-border/25 bg-signal/6" : "border-b border-border/25"}>
                        <td className="px-4 py-1.5">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: band.color }} />
                            <span className="text-[11px] font-medium">{band.label}</span>
                            {isCurrent && <span className="chip-signal">now</span>}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                          {band.lo.toFixed(2)}x — {band.hi === null ? "∞" : `${band.hi.toFixed(2)}x`}
                        </td>
                        <td className="px-4 py-1.5 text-right">
                          <span className="flex items-center justify-end gap-2">
                            <span className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                              <span
                                className="block h-full rounded-full"
                                style={{ width: `${(histogram?.share ?? 0) * 100 * 3}%`, backgroundColor: band.color }}
                              />
                            </span>
                            <span className="w-9 font-mono text-[10px] tabular-nums text-muted-foreground">
                              {percent(histogram?.share ?? 0, 1)}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="State Vocabulary" subtitle="layer 6 · what each market state means">
            {!data ? (
              <EmptyState compact title="Loading states" />
            ) : (
              <ul className="space-y-2">
                {data.states.map((entry) => (
                  <li
                    key={entry.state}
                    className={`rounded-md border px-3 py-2.5 ${data.current.state === entry.state ? "border-signal/35 bg-signal/8" : "border-border/40 bg-muted/12"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StateBadge state={entry.state} size="sm" />
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{entry.tone}</span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{entry.meaning}</p>
                    {analysis?.state_scores?.[entry.state] !== undefined && (
                      <div className="mt-1.5 meter-track">
                        <div
                          className="meter-fill"
                          style={{ width: `${(analysis.state_scores[entry.state] ?? 0) * 100}%`, backgroundColor: entry.color }}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Band Distribution" subtitle="observed counts across the analysis window">
            {(analysis?.band_histogram.length ?? 0) === 0 ? (
              <EmptyState compact title="No distribution" />
            ) : (
              <BandDistribution histogram={analysis?.band_histogram ?? []} height={230} />
            )}
          </Panel>

          <Panel title="Layer Inspector" subtitle="walk any multiplier through every layer" icon={<Fingerprint className="h-3.5 w-3.5" />}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="probe" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Multiplier
                </Label>
                <Input
                  id="probe"
                  type="number"
                  min={1}
                  step={0.01}
                  value={probe}
                  onChange={(event) => setProbe(event.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              {explain && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-muted/15 px-3 py-2.5">
                    <span className="font-mono text-xl font-semibold tabular-nums" style={{ color: explain.token.color }}>
                      {multiplier(explain.token.multiplier)}
                    </span>
                    <span className="chip-info">{explain.token.band_label}</span>
                    <span className="chip-muted">{explain.token.energy}</span>
                    <span className="chip-muted">{decimal(explain.token.points, 1)} pts</span>
                  </div>

                  <dl className="space-y-1">
                    {Object.entries(explain.layers).map(([layer, detail]) => (
                      <div key={layer} className="flex items-baseline justify-between gap-3 border-b border-border/25 py-1.5 last:border-0">
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {layer.replace(/_/g, " ")}
                        </dt>
                        <dd className="text-right font-mono text-[10px] tabular-nums text-foreground/80">
                          {Object.entries(detail)
                            .map(([key, value]) => `${key}: ${String(value)}`)
                            .join(" · ")}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {explain.next_band && (
                    <p className="text-[11px] text-muted-foreground">
                      Next band up is <span className="text-foreground/90">{explain.next_band.label}</span> starting at{" "}
                      <span className="font-mono">{multiplier(explain.next_band.lo)}</span>.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {data && data.tokens.length > 0 && (
          <Panel title="Token Tape" subtitle="the last rounds expressed in the Momento language">
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
              {[...data.tokens].reverse().map((token, index) => (
                <div
                  key={index}
                  className="min-w-[76px] shrink-0 rounded-md border border-border/50 bg-muted/15 px-2 py-2 text-center"
                  style={{ borderColor: `${token.color}44` }}
                >
                  <p className="font-mono text-xs font-semibold tabular-nums" style={{ color: token.color }}>
                    {multiplier(token.multiplier)}
                  </p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{token.band_label}</p>
                  <p className="font-mono text-[9px] text-muted-foreground/60">{token.energy}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
