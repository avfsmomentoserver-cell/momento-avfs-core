import { useQuery } from "@tanstack/react-query";
import { Database, Download, Expand, Eye, Filter, Loader2, Minimize, RefreshCw } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { POLL } from "@/lib/config";
import { clockTime, decimal, integer, multiplier, percent } from "@/lib/format";
import { usePlatform } from "@/state/PlatformProvider";

/**
 * Mawillah's Eagle Eye Dashboard: continuous, filterable round analysis
 * with advanced filtering capabilities for deep data exploration.
 */
export default function EagleEye() {
  const { source } = usePlatform();

  // Filter state
  const [range1Min, setRange1Min] = useState<number>(1);
  const [range1Max, setRange1Max] = useState<number>(2);
  const [range2Min, setRange2Min] = useState<number>(2);
  const [range2Max, setRange2Max] = useState<number>(10);
  const [range3Min, setRange3Min] = useState<number>(10);
  const [range3Max, setRange3Max] = useState<number>(100);
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [ingestMethodFilter, setIngestMethodFilter] = useState<string>("file");
  const [selectedSession, setSelectedSession] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isRebuilding, setIsRebuilding] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(500);

  // Query for sessions
  const sessionsQuery = useQuery({
    queryKey: ["eagle-eye-sessions", source],
    queryFn: () => api.sessions(source, 100),
    refetchInterval: false,
  });

  // Query for all rounds with filters
  const roundsQuery = useQuery({
    queryKey: ["eagle-eye-rounds", source, ingestMethodFilter],
    queryFn: () => api.allRounds(source, ingestMethodFilter === "all" ? undefined : ingestMethodFilter),
    refetchInterval: autoRefresh ? POLL.rounds : false,
  });

  const allRounds = roundsQuery.data?.rounds ?? [];
  const total = roundsQuery.data?.total ?? 0;
  const sessions = sessionsQuery.data?.sessions ?? [];

  // Apply client-side filters
  const filteredRounds = allRounds.filter((round) => {
    // Check if multiplier falls within any of the three ranges
    const inRange1 = round.multiplier >= range1Min && round.multiplier <= range1Max;
    const inRange2 = round.multiplier >= range2Min && round.multiplier <= range2Max;
    const inRange3 = round.multiplier >= range3Min && round.multiplier <= range3Max;
    if (!inRange1 && !inRange2 && !inRange3) return false;
    if (colorFilter !== "all" && round.color !== colorFilter) return false;
    if (selectedSession !== "all") {
      const session = sessions.find(s => s.id === parseInt(selectedSession));
      if (session) {
        const sessionStart = new Date(session.started_at).getTime();
        const sessionEnd = new Date(session.ended_at).getTime();
        const roundTime = new Date(round.timestamp).getTime();
        if (roundTime < sessionStart || roundTime > sessionEnd) return false;
      }
    }
    return true;
  });

  // Paginate filtered rounds
  const totalPages = Math.ceil(filteredRounds.length / pageSize);
  const paginatedRounds = filteredRounds.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate statistics
  const avgMultiplier = filteredRounds.length > 0
    ? filteredRounds.reduce((sum, r) => sum + r.multiplier, 0) / filteredRounds.length
    : 0;

  const colorDistribution: Record<string, number> = {};
  filteredRounds.forEach((round) => {
    if (round.color) {
      colorDistribution[round.color] = (colorDistribution[round.color] || 0) + 1;
    }
  });

  const ingestMethodDistribution: Record<string, number> = {};
  filteredRounds.forEach((round) => {
    if (round.ingest_method) {
      ingestMethodDistribution[round.ingest_method] = (ingestMethodDistribution[round.ingest_method] || 0) + 1;
    }
  });

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.().catch(err => {
        console.log("Fullscreen not supported or denied");
      });
    } else {
      document.exitFullscreen?.().catch(err => {
        console.log("Exit fullscreen failed");
      });
    }
  };

  const handleRebuildSessions = async () => {
    setIsRebuilding(true);
    try {
      await api.rebuildSessions(source, true);
      await sessionsQuery.refetch();
    } catch (error) {
      console.error("Failed to rebuild sessions:", error);
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleExportCsv = () => {
    const csvContent = [
      ["ID", "Timestamp", "Multiplier", "Color", "Band", "Points", "Ingest Method"],
      ...filteredRounds.map(r => [
        r.id,
        r.timestamp,
        r.multiplier,
        r.color || "",
        r.band || "",
        r.points || "",
        r.ingest_method || ""
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `eagle-eye-export-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell
      title="Mawillah's Eagle Eye"
      subtitle="Continuous, filterable round analysis"
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleExportCsv}
            disabled={filteredRounds.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => roundsQuery.refetch()}
            disabled={roundsQuery.isFetching}
          >
            {roundsQuery.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Total rounds"
            value={integer(filteredRounds.length)}
            accent="signal"
            hint={`of ${integer(total)} total`}
            emphasis
          />
          <StatTile
            label="Average multiplier"
            value={decimal(avgMultiplier)}
            accent="violet"
            hint="mean of filtered rounds"
          />
          <StatTile
            label="Total range"
            value={`${decimal(range1Min)}-${decimal(range3Max)}x`}
            accent="info"
            hint="multiplier range coverage"
          />
          <StatTile
            label="Ingest methods"
            value={Object.keys(ingestMethodDistribution).length}
            accent="info"
            hint={`file: ${integer(ingestMethodDistribution["file"] || 0)}, live: ${integer(ingestMethodDistribution["live-feed"] || 0)}`}
          />
          <StatTile
            label="Color distribution"
            value={Object.keys(colorDistribution).length > 0 ? colorDistribution["green"] > colorDistribution["red"] ? "Green" : "Red" : "—"}
            accent={Object.keys(colorDistribution).length > 0 && colorDistribution["green"] > colorDistribution["red"] ? "signal" : "critical"}
            hint={`green: ${integer(colorDistribution["green"] || 0)}, red: ${integer(colorDistribution["red"] || 0)}`}
          />
        </div>

        <Panel title="Filters" subtitle="Advanced round filtering" icon={<Filter className="h-3.5 w-3.5" />} lit>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Color filter</Label>
                <Select value={colorFilter} onValueChange={setColorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All colors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All colors</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Ingest method</Label>
                <Select value={ingestMethodFilter} onValueChange={setIngestMethodFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods ({integer(total)})</SelectItem>
                    <SelectItem value="file">File ({integer(allRounds.filter(r => r.ingest_method === "file").length)})</SelectItem>
                    <SelectItem value="api">API ({integer(allRounds.filter(r => r.ingest_method === "api").length)})</SelectItem>
                    <SelectItem value="live-feed">Live Feed ({integer(allRounds.filter(r => r.ingest_method === "live-feed").length)})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Multiplier ranges</Label>
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-muted-foreground w-8">Range 1:</span>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      value={range1Min}
                      onChange={(e) => setRange1Min(parseFloat(e.target.value) || 1)}
                      placeholder="Min"
                      className="font-mono text-xs"
                    />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      value={range1Max}
                      onChange={(e) => setRange1Max(parseFloat(e.target.value) || 2)}
                      placeholder="Max"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-muted-foreground w-8">Range 2:</span>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      value={range2Min}
                      onChange={(e) => setRange2Min(parseFloat(e.target.value) || 2)}
                      placeholder="Min"
                      className="font-mono text-xs"
                    />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      value={range2Max}
                      onChange={(e) => setRange2Max(parseFloat(e.target.value) || 10)}
                      placeholder="Max"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-muted-foreground w-8">Range 3:</span>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      value={range3Min}
                      onChange={(e) => setRange3Min(parseFloat(e.target.value) || 10)}
                      placeholder="Min"
                      className="font-mono text-xs"
                    />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                    value={range3Max}
                      onChange={(e) => setRange3Max(parseFloat(e.target.value) || 100)}
                      placeholder="Max"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Session</Label>
                <div className="flex gap-2">
                  <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="All history" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All history</SelectItem>
                      {sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id.toString()}>
                          Session #{session.id} ({session.round_count} rounds, peak: {multiplier(session.peak)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRebuildSessions}
                    disabled={isRebuilding}
                    title="Rebuild sessions from full database history"
                  >
                    {isRebuilding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Auto refresh</Label>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Multiplier Stream"
          subtitle={`${integer(filteredRounds.length)} rounds (page ${currentPage} of ${totalPages})`}
          icon={<Eye className="h-3.5 w-3.5" />}
          actions={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleFullscreen}
                className="gap-1.5"
              >
                {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </Button>
            </div>
          }
        >
          {filteredRounds.length === 0 ? (
            <div className="p-4">
              <EmptyState compact title="No rounds found" description="Adjust filters or import data to see rounds here." />
            </div>
          ) : (
            <div className={isFullscreen ? "no-scrollbar h-[calc(100vh-180px)] overflow-y-auto" : "no-scrollbar max-h-[600px] overflow-y-auto"}>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}>
                {paginatedRounds.map((round, index) => {
                  let color: string;
                  if (round.multiplier < 2.0) {
                    color = "rgb(52, 180, 255)";
                  } else if (round.multiplier < 10.0) {
                    color = "rgb(145, 62, 248)";
                  } else {
                    color = "rgb(192, 23, 180)";
                  }
                  return (
                    <div
                      key={round.id}
                      className="flex items-center justify-center rounded border border-border/30 bg-muted/10 px-2 py-1.5 font-mono text-[10px] tabular-nums"
                      style={{ color, borderColor: `${color}40` }}
                    >
                      {multiplier(round.multiplier)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
