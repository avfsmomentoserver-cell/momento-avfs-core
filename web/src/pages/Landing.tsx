import {
  Activity,
  ArrowRight,
  Blocks,
  BrainCircuit,
  Compass,
  Database,
  Dna,
  Gauge,
  Radio,
  Rocket,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Sparkline } from "@/components/console/Sparkline";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { API_BASE_URL, PLATFORM, POLL } from "@/lib/config";
import { integer, multiplier, percent } from "@/lib/format";
import { useAuth } from "@/state/AuthProvider";

const PIPELINE = ["Collector", "Ingest API", "Analysis", "Forecast", "Database", "Dashboard"] as const;

const CAPABILITIES = [
  {
    icon: Radio,
    title: "Ingest that never guesses",
    body: "A polling file watcher, a REST push endpoint, drag-and-drop upload and a provably-fair round engine all write through one normalising pipeline with hash-chain verification and strict deduplication.",
  },
  {
    icon: Activity,
    title: "Structure, not vibes",
    body: "Ascending and collapse ladders, nested compression, variance shelves, bait spikes and clustered resistance zones — each scored on the same 0–1 scale in Momento point space.",
  },
  {
    icon: Dna,
    title: "Semantic market language",
    body: "Eight linguistic layers turn raw multipliers into bands, energy, shape, state and a plain-English narrative every engine and every operator shares.",
  },
  {
    icon: BrainCircuit,
    title: "Forecasts you can audit",
    body: "Markov transitions, empirical percentiles and DNA analogue matching blend into one range. Every forecast is stored before the round lands, then scored — Brier included.",
  },
  {
    icon: Compass,
    title: "Decisions, not signals",
    body: "Patience, speed, risk and mistake-prevention engines collapse the whole picture into a single instruction with a size, a target and a hard stop.",
  },
  {
    icon: Blocks,
    title: "Plug-and-play analyzers",
    body: "Every analyzer is a registered plugin with live weights, thresholds and its own performance history. Derive new ones from the console without a redeploy.",
  },
] as const;

const SUB_PROJECTS = [
  { name: "Collector & Ingest", detail: "watcher · REST · upload · live engine" },
  { name: "Analysis Core", detail: "ladders · resistance · regimes · edge fit" },
  { name: "MomentoLinguistics", detail: "8-layer semantic vocabulary" },
  { name: "Forecast Engine", detail: "markov · percentile · DNA · ML ensemble" },
  { name: "Decision Orchestrator", detail: "patience · speed · risk · guardrails" },
  { name: "Autopilot Ledger", detail: "recorded decisions, measured P&L" },
  { name: "Plugin Inventory", detail: "registry · weights · run history" },
  { name: "Consumer App", detail: "daily guidance · premium tiers" },
] as const;

/** Public entry point: platform pitch plus routing into the two surfaces. */
export default function Landing() {
  const { isAuthenticated, isOperator } = useAuth();

  const healthQuery = useQuery({
    queryKey: ["landing-health"],
    queryFn: () => api.health(),
    refetchInterval: POLL.health,
    retry: 1,
  });

  const roundsQuery = useQuery({
    queryKey: ["landing-rounds"],
    queryFn: () => api.rounds("aviator", 60, 0, "desc", "file"),
    refetchInterval: POLL.analysis,
    retry: 1,
  });

  const analysisQuery = useQuery({
    queryKey: ["landing-analysis"],
    queryFn: () => api.analysis("aviator", 300, "file"),
    refetchInterval: POLL.analysis,
    retry: 1,
  });

  const online = healthQuery.data?.status === "healthy";
  const totalRounds = healthQuery.data?.database.counts.rounds ?? 0;
  const spark = [...(roundsQuery.data?.rounds ?? [])].reverse().map((round) => round.multiplier);
  const analysis = analysisQuery.data;

  return (
    <div className="min-h-screen">
      {/* ---- top bar ---- */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-signal/40 bg-signal/10">
              <span className="font-mono text-[11px] font-bold text-signal">Λ</span>
            </span>
            <span className="leading-tight">
              <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.2em]">{PLATFORM.suite}</span>
              <span className="block text-[10px] text-muted-foreground">{PLATFORM.name} v{PLATFORM.version}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={online ? "chip-signal" : "chip-critical"}
              title={online ? `Backend healthy at ${API_BASE_URL}` : `No backend at ${API_BASE_URL}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {online ? "Backend online" : "Backend offline"}
            </span>
            {isAuthenticated ? (
              <Button asChild size="sm" variant="outline">
                <Link to={isOperator ? "/dashboard" : "/app"}>Continue</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="ghost">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ---- hero ---- */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="max-w-3xl">
            <span className="chip-signal animate-rise">
              <Terminal className="h-2.5 w-2.5" />
              {PLATFORM.tagline}
            </span>

            <h1 className="mt-5 animate-rise text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              A forecasting platform that
              <span className="text-signal text-glow"> shows its work</span>.
            </h1>

            <p className="mt-5 max-w-2xl animate-rise text-base leading-relaxed text-muted-foreground">
              Momento Core ingests crash-curve round data, describes it in a shared semantic language, forecasts the next
              round from three independent estimators, and turns the result into one auditable instruction. Python backend,
              SQLite storage, live WebSocket telemetry — all hosted locally, nothing hidden.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2 bg-signal font-semibold text-primary-foreground hover:bg-signal/90">
                <Link to="/dashboard">
                  Open Operator Console
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link to="/app">
                  <Rocket className="h-4 w-4" />
                  Consumer App
                </Link>
              </Button>
            </div>

            {/* pipeline */}
            <div className="mt-10 flex flex-wrap items-center gap-1.5">
              {PIPELINE.map((stage, index) => (
                <span key={stage} className="flex items-center gap-1.5">
                  <span className="rounded border border-border/70 bg-card/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {stage}
                  </span>
                  {index < PIPELINE.length - 1 && <ArrowRight className="h-3 w-3 text-border" />}
                </span>
              ))}
            </div>
          </div>

          {/* live strip */}
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel panel-lit px-4 py-3">
              <p className="hud-label">Rounds stored</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-signal">{integer(totalRounds)}</p>
              {spark.length > 2 && <Sparkline values={spark} width={150} height={30} className="mt-1" />}
            </div>
            <div className="panel px-4 py-3">
              <p className="hud-label">Market state</p>
              <p className="mt-1 font-mono text-2xl font-semibold">{analysis?.state ?? "—"}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {analysis?.regime ? `${analysis.regime.regime} regime` : "awaiting data"}
              </p>
            </div>
            <div className="panel px-4 py-3">
              <p className="hud-label">Last multiplier</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-info">
                {multiplier(analysis?.latest.multiplier)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">{analysis?.latest.band ?? "—"} band</p>
            </div>
            <div className="panel px-4 py-3">
              <p className="hud-label">Forecast confidence</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-caution">
                {percent(analysis?.prediction_confidence.confidence)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {analysis?.accuracy?.total ? `${integer(analysis.accuracy.total)} resolved` : "no resolutions yet"}
              </p>
            </div>
          </div>

          {!online && (
            <p className="mt-4 rounded-md border border-caution/30 bg-caution/8 px-3 py-2 text-[11px] text-caution">
              The Python backend is not reachable at <code className="font-mono">{API_BASE_URL}</code>. Start it with{" "}
              <code className="font-mono">cd backend &amp;&amp; pip install -r requirements.txt &amp;&amp; python3 run_api.py</code>.
            </p>
          )}
        </div>
      </section>

      {/* ---- two surfaces ---- */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-xl font-bold tracking-tight">Two surfaces, one core</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The same engines drive a dense operator console and a deliberately simple consumer app.
        </p>

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <Link
            to="/dashboard"
            className="panel group relative overflow-hidden p-6 transition-colors hover:border-signal/50"
          >
            <Gauge className="h-6 w-6 text-signal" />
            <h3 className="mt-4 text-lg font-bold">Operator Console</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Nineteen instrumented screens: command center, market and ladder telemetry, resistance mapping, moonshot
              cadence, DNA hunting, forecast studio, orchestrator, autopilot ledger, plugin inventory, ingest console and
              full platform administration.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-signal">
              Enter console
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link to="/app" className="panel group relative overflow-hidden p-6 transition-colors hover:border-info/50">
            <ShieldCheck className="h-6 w-6 text-info" />
            <h3 className="mt-4 text-lg font-bold">Consumer App</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              One clear read per session: today's mood, a ripeness gauge, a suggested cash-out with an explicit stop, and
              an honest confidence label. Pro predictions and analogue history sit behind the premium tier.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-info">
              Open app
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* ---- capabilities ---- */}
      <section className="border-y border-border/50 bg-card/25">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-xl font-bold tracking-tight">What the core actually does</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="panel p-5">
                  <Icon className="h-5 w-5 text-signal/80" />
                  <h3 className="mt-3.5 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- sub-projects ---- */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-signal/80" />
          <h2 className="text-xl font-bold tracking-tight">Eight sub-projects, one repository</h2>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Each module owns a single responsibility and is wired through explicit interfaces.
        </p>

        <div className="mt-7 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {SUB_PROJECTS.map((project, index) => (
            <div key={project.name} className="panel px-4 py-3.5">
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-1 text-xs font-semibold">{project.name}</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{project.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {PLATFORM.suite} · {PLATFORM.name} v{PLATFORM.version}
          </p>
          <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground/70">
            Analytical instrumentation only. Forecasts are probabilistic estimates over historical structure, never
            guarantees. Use the platform to understand behaviour, and never wager funds you cannot afford to lose.
          </p>
        </div>
      </footer>
    </div>
  );
}
