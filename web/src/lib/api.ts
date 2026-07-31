/**
 * Typed HTTP client for the Momento Core backend.
 *
 * Every call goes through `request()`, which handles timeouts, bearer tokens,
 * retries on transient failures and a single normalised error type.
 */

import { API_BASE_URL, API_PREFIX, STORAGE_KEYS } from "./config";
import type {
  AccuracyReport,
  AnalysisPayload,
  AutopilotDecision,
  AutopilotStatus,
  BacktestConfig,
  BacktestResponse,
  BacktestResults,
  BacktestRun,
  BuildStepsResponse,
  CalibrationRunResponse,
  CalibrationStatus,
  Candle,
  CeilingAnalyzerResponse,
  DnaReport,
  EnginesHealth,
  EquityPoint,
  ExplainResponse,
  FeedStatus,
  ForecastLedgerRow,
  ForecastResult,
  GapSwingAnalyzerResponse,
  HealthReport,
  HouseEdge,
  IngestLogEntry,
  LinguisticsPayload,
  MegaScore,
  MlPredictions,
  MoonshotEta,
  OrchestratorModule,
  OrchestratorPlan,
  PhaseSample,
  PluginRecord,
  PluginRunResult,
  PluginStatistics,
  PlatformOverview,
  PointSample,
  ResistanceResponse,
  RoundRecord,
  RoundsResponse,
  SourceInfo,
  UserRecord,
  WatcherStatus,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "request_failed") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  try {
    if (token) {
      window.localStorage.setItem(STORAGE_KEYS.token, token);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.token);
    }
  } catch {
    // Private browsing / storage disabled — the in-memory token still works.
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  try {
    authToken = window.localStorage.getItem(STORAGE_KEYS.token);
  } catch {
    authToken = null;
  }
  return authToken;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
  raw?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = 15000, retries = method === "GET" ? 1 : 0 } = options;
  const url = `${API_BASE_URL}${path.startsWith("/api") || options.raw ? "" : API_PREFIX}${path}`;

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      window.clearTimeout(timer);

      if (!response.ok) {
        let detail = `Request failed with status ${response.status}`;
        try {
          const parsed = (await response.json()) as { detail?: string | { msg?: string }[] };
          if (typeof parsed.detail === "string") {
            detail = parsed.detail;
          } else if (Array.isArray(parsed.detail) && parsed.detail[0]?.msg) {
            detail = String(parsed.detail[0].msg);
          }
        } catch {
          // Non-JSON error body — keep the status message.
        }

        const error = new ApiError(detail, response.status, `http_${response.status}`);
        // Client errors are final; server errors may be retried.
        if (response.status < 500) throw error;
        lastError = error;
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        return (await response.json()) as T;
      }
      return (await response.text()) as unknown as T;
    } catch (error) {
      window.clearTimeout(timer);

      if (error instanceof ApiError) {
        if (error.status < 500) throw error;
        lastError = error;
        continue;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new ApiError("The request timed out.", 408, "timeout");
        continue;
      }
      lastError = new ApiError(
        "Cannot reach the Momento Core backend. Confirm the Python API is running.",
        0,
        "network",
      );
    }
  }

  throw lastError ?? new ApiError("Unknown request failure", 0, "unknown");
}

const qs = (params: Record<string, string | number | boolean | undefined>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};

/* ========================================================================== */
/* platform                                                                   */
/* ========================================================================== */

export const api = {
  health: () => request<HealthReport>("/health"),
  enginesHealth: () => request<EnginesHealth>("/engines/health"),
  settings: () =>
    request<{
      analysis: Record<string, number>;
      runtime: Record<string, boolean>;
      backtesting: Record<string, number | boolean>;
      dashboard: Record<string, number | boolean>;
      environment: Record<string, string | boolean | string[]>;
      database: HealthReport["database"];
    }>("/settings"),
  updateSettings: (body: {
    analysis?: Record<string, number>;
    runtime?: Record<string, boolean>;
    backtesting?: Record<string, number | boolean>;
    dashboard?: Record<string, number | boolean>;
  }) =>
    request<{
      analysis: Record<string, number>;
      runtime: Record<string, boolean>;
      backtesting: Record<string, number | boolean>;
      dashboard: Record<string, number | boolean>;
    }>("/settings", { method: "PUT", body }),

  sources: () => request<{ sources: SourceInfo[] }>("/sources"),
  upsertSource: (body: { id: string; name: string; icon?: string; active?: boolean }) =>
    request<{ sources: SourceInfo[] }>("/sources", { method: "POST", body }),
  deleteSource: (id: string) => request<{ sources: SourceInfo[] }>(`/sources/${id}`, { method: "DELETE" }),
  purgeSource: (id: string) => request<{ deleted: number; source: string }>(`/sources/${id}/rounds`, { method: "DELETE" }),
  audit: (limit = 100) =>
    request<{ entries: { id: number; actor: string | null; action: string; detail: string | null; created_at: string }[] }>(
      `/audit${qs({ limit })}`,
    ),

  // Generic request method for arbitrary endpoints
  request: <T = unknown>(path: string, options?: RequestOptions) => request<T>(path, options),

  /* ---- rounds ----------------------------------------------------------- */
  rounds: (source: string, limit = 200, offset = 0, order: "asc" | "desc" = "desc", ingestMethod?: string) =>
    request<RoundsResponse>(`/rounds${qs({ source, limit, offset, order, ingest_method: ingestMethod })}`),
  allRounds: (source: string, ingestMethod?: string) =>
    request<RoundsResponse>(`/rounds/all${qs({ source, ingest_method: ingestMethod })}`),
  latestRounds: (source: string, n = 20) =>
    request<{ rounds: RoundRecord[]; count: number; total: number; source: string }>(`/rounds/latest${qs({ source, n })}`),
  round: (id: number) => request<RoundRecord>(`/rounds/${id}`),
  exportCsvUrl: (source: string, limit = 5000) => `${API_BASE_URL}${API_PREFIX}/rounds/export${qs({ source, limit })}`,
  sessions: (source: string, limit = 60) =>
    request<{ sessions: { id: number; started_at: string; ended_at: string; round_count: number; peak: number; mean: number }[]; source: string }>(
      `/sessions${qs({ source, limit })}`,
    ),
  rebuildSessions: (source: string, useFullHistory = false) =>
    request<{ sessions_written: number; full_history: boolean }>(`/sessions/rebuild${qs({ source, use_full_history: useFullHistory })}`, { method: "POST" }),
  statistics: (source: string) => request<Record<string, unknown>>(`/statistics${qs({ source })}`),

  /* ---- analysis --------------------------------------------------------- */
  analysis: (source: string, limit = 600, ingestMethod?: string) =>
    request<AnalysisPayload>(`/analysis${qs({ source, limit, ingest_method: ingestMethod })}`),
  resistance: (source: string, ingestMethod?: string) =>
    request<ResistanceResponse>(`/analysis/resistance${qs({ source, ingest_method: ingestMethod })}`),
  ceiling: (source: string, ingestMethod?: string) =>
    request<CeilingAnalyzerResponse>(`/analysis/ceiling${qs({ source, ingest_method: ingestMethod })}`),
  gapSwing: (source: string, ingestMethod?: string) =>
    request<GapSwingAnalyzerResponse>(`/analysis/gap-swing${qs({ source, ingest_method: ingestMethod })}`),
  dna: (source: string, tolerance?: number, window?: number, ingestMethod?: string) =>
    request<{ source: string; report: DnaReport; settings: { tolerance: number; window: number }; samples: number }>(
      `/analysis/dna${qs({ source, tolerance, window, ingest_method: ingestMethod })}`,
    ),
  houseEdge: (source: string, ingestMethod?: string) =>
    request<HouseEdge & { source: string }>(`/analysis/house-edge${qs({ source, ingest_method: ingestMethod })}`),
  moonshot: (source: string, ingestMethod?: string) =>
    request<{ source: string; eta: MoonshotEta[]; mega_scores: MegaScore[]; band_exhaustion: AnalysisPayload["band_exhaustion"]; dna: DnaReport }>(
      `/analysis/moonshot${qs({ source, ingest_method: ingestMethod })}`,
    ),
  ml: (source: string, ingestMethod?: string) =>
    request<MlPredictions & { source: string }>(`/analysis/ml${qs({ source, ingest_method: ingestMethod })}`),
  runPlugins: (source: string, ingestMethod?: string) =>
    request<{ source: string; results: PluginRunResult[]; count: number }>(`/analysis/plugins${qs({ source, ingest_method: ingestMethod })}`),
  linguistics: (source: string, ingestMethod?: string) =>
    request<LinguisticsPayload>(`/linguistics${qs({ source, ingest_method: ingestMethod })}`),
  explain: (multiplier: number) => request<ExplainResponse>(`/linguistics/explain${qs({ multiplier })}`),

  /* ---- market ----------------------------------------------------------- */
  candles: (source: string, limit = 600, roundsPerCandle = 5, ingestMethod?: string) =>
    request<{ source: string; candles: Candle[]; count: number; rounds_per_candle: number }>(
      `/market/candles${qs({ source, limit, rounds_per_candle: roundsPerCandle, ingest_method: ingestMethod })}`,
    ),
  points: (source: string, limit = 400, ingestMethod?: string) =>
    request<{ source: string; series: PointSample[]; count: number }>(`/market/points${qs({ source, limit, ingest_method: ingestMethod })}`),
  sessionPhases: (source: string, limit = 400, ingestMethod?: string) =>
    request<{ source: string; phases: PhaseSample[]; count: number; mega_scores: MegaScore[] }>(
      `/market/session-phases${qs({ source, limit, ingest_method: ingestMethod })}`,
    ),
  marketLive: (source: string) => request<Record<string, unknown>>(`/market/live${qs({ source })}`),

  /* ---- backtest --------------------------------------------------------- */
  backtestRun: (source: string, config: Record<string, unknown>) =>
    request<{ run_id: number; status: string; source: string }>("/backtest/run", { method: "POST", body: { source, config } }),
  backtestRuns: (source: string, limit = 50) =>
    request<{ source: string; runs: BacktestRun[]; count: number }>(`/backtest/runs${qs({ source, limit })}`),
  backtestResult: (id: number) => request<BacktestRun>(`/backtest/run/${id}`),
  deleteBacktest: (id: number) => request<{ deleted: number }>(`/backtest/run/${id}`, { method: "DELETE" }),
  backtestStatus: () => request<{ running_backtests: number; status: string }>("/backtest/status"),

  /* ---- forecast --------------------------------------------------------- */
  forecast: (source: string) =>
    request<{ source: string; forecast: ForecastResult | null; predictions: AnalysisPayload["predictions"]; accuracy: AccuracyReport }>(
      `/forecasts${qs({ source })}`,
    ),
  forecastHistory: (source: string, limit = 100) =>
    request<{ source: string; forecasts: ForecastLedgerRow[]; accuracy: AccuracyReport }>(
      `/forecasts/history${qs({ source, limit })}`,
    ),
  recordForecast: (source: string) =>
    request<{ recorded: boolean; forecast_id: number | null; pending: number }>(`/forecasts/record${qs({ source })}`, { method: "POST" }),
  accuracy: (source: string) => request<AccuracyReport & { source: string }>(`/forecasts/accuracy${qs({ source })}`),
  transitions: (source: string, limit = 600) =>
    request<{ source: string; transitions: AnalysisPayload["transitions"]; matrix: Record<string, Record<string, number>>; samples: number }>(
      `/forecasts/transitions${qs({ source, limit })}`,
    ),
  calibrationStatus: (source: string) => request<CalibrationStatus>(`/calibration/status${qs({ source })}`),
  runCalibration: (source: string) => request<CalibrationRunResponse>(`/calibration/run${qs({ source })}`, { method: "POST" }),
  runBacktest: (source: string, horizon = 1) =>
    request<BacktestResponse>(`/calibration/backtest${qs({ source, horizon })}`, { method: "POST", timeoutMs: 60000 }),
  metrics: (source: string, name: string, limit = 100) =>
    request<{ series: { value: number; detail: string | null; created_at: string }[] }>(`/metrics${qs({ source, name, limit })}`),

  /* ---- plugin inventory ------------------------------------------------- */
  inventory: () => request<{ plugins: PluginRecord[]; statistics: PluginStatistics }>("/inventory"),
  pluginDetail: (id: string) =>
    request<{ plugin: PluginRecord; recent_runs: { signal: string; score: number; processing_ms: number; created_at: string }[] }>(
      `/inventory/${id}`,
    ),
  togglePlugin: (id: string, enabled: boolean) =>
    request<{ plugin: PluginRecord }>(`/inventory/${id}/enabled`, { method: "PUT", body: { enabled } }),
  configurePlugin: (id: string, config: Record<string, unknown>) =>
    request<{ plugin: PluginRecord }>(`/inventory/${id}/config`, { method: "PUT", body: { config } }),
  createPlugin: (body: Record<string, unknown>) =>
    request<{ plugin: PluginRecord; statistics: PluginStatistics }>("/inventory", { method: "POST", body }),
  deletePlugin: (id: string) => request<{ deleted: string; statistics: PluginStatistics }>(`/inventory/${id}`, { method: "DELETE" }),

  /* ---- orchestrator ----------------------------------------------------- */
  orchestrator: (source: string) => request<OrchestratorPlan>(`/orchestrator${qs({ source })}`),
  orchestratorSettings: () =>
    request<{ settings: Record<string, string | number>; modules: OrchestratorModule[] }>("/orchestrator/settings"),
  updateOrchestratorSettings: (body: Record<string, string | number>) =>
    request<{ settings: Record<string, string | number>; modules: OrchestratorModule[] }>("/orchestrator/settings", {
      method: "PUT",
      body,
    }),

  /* ---- autopilot -------------------------------------------------------- */
  autopilotStatus: (source: string) => request<AutopilotStatus>(`/autopilot/status${qs({ source })}`),
  autopilotDecisions: (source: string, limit = 100) =>
    request<{ source: string; decisions: AutopilotDecision[]; equity_curve: EquityPoint[] }>(
      `/autopilot/decisions${qs({ source, limit })}`,
    ),
  autopilotConfig: () => request<{ config: Record<string, string | number | boolean> }>("/autopilot/config"),
  updateAutopilotConfig: (body: Record<string, string | number | boolean>) =>
    request<{ config: Record<string, string | number | boolean> }>("/autopilot/config", { method: "PUT", body }),
  autopilotStart: () => request<AutopilotStatus>("/autopilot/start", { method: "POST" }),
  autopilotStop: () => request<AutopilotStatus>("/autopilot/stop", { method: "POST" }),
  autopilotEvaluate: (source: string) =>
    request<{ source: string; decision: Record<string, unknown>; status: AutopilotStatus }>(`/autopilot/evaluate${qs({ source })}`, {
      method: "POST",
    }),
  autopilotReset: (source: string) =>
    request<{ deleted: number; status: AutopilotStatus }>(`/autopilot/reset${qs({ source })}`, { method: "POST" }),

  /* ---- ingest ----------------------------------------------------------- */
  ingest: (body: { source: string; rounds?: unknown[]; payload?: unknown; raw?: string }) =>
    request<{ imported: number; duplicates: number; rejected: number; sources: string[]; rounds: RoundRecord[] }>("/ingest", {
      method: "POST",
      body,
    }),
  ingestStatus: () =>
    request<{ watcher: WatcherStatus; feed: FeedStatus; recent: IngestLogEntry[]; directories: Record<string, string> }>(
      "/ingest/status",
    ),
  ingestHistory: (limit = 50) => request<{ entries: IngestLogEntry[] }>(`/ingest/history${qs({ limit })}`),
  watcherScan: () => request<{ scan: Record<string, number>; watcher: WatcherStatus }>("/ingest/watcher/scan", { method: "POST" }),
  watcherStart: () => request<{ watcher: WatcherStatus }>("/ingest/watcher/start", { method: "POST" }),
  watcherStop: () => request<{ watcher: WatcherStatus }>("/ingest/watcher/stop", { method: "POST" }),

  uploadRounds: async (file: File, source: string): Promise<{ imported: number; duplicates: number; filename: string }> => {
    const form = new FormData();
    form.append("file", file);
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/ingest/upload${qs({ source })}`, {
      method: "POST",
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      let detail = `Upload failed (${response.status})`;
      try {
        const parsed = (await response.json()) as { detail?: string };
        if (parsed.detail) detail = parsed.detail;
      } catch {
        // keep the default message
      }
      throw new ApiError(detail, response.status, "upload_failed");
    }
    return (await response.json()) as { imported: number; duplicates: number; filename: string };
  },

  /* ---- live feed -------------------------------------------------------- */
  feedStatus: () => request<FeedStatus>("/feed/status"),
  feedStart: (body: { source: string; interval_seconds: number; house_edge: number; jitter: number }) =>
    request<FeedStatus>("/feed/start", { method: "POST", body }),
  feedStop: () => request<FeedStatus>("/feed/stop", { method: "POST" }),
  feedStep: () => request<{ round: RoundRecord; feed: FeedStatus }>("/feed/step", { method: "POST" }),
  feedVerify: (body: { seed: string; multiplier: number; house_edge: number }) =>
    request<{ valid: boolean; computed_multiplier: number; hash: string; salt: string; next_seed_check: string }>("/feed/verify", {
      method: "POST",
      body,
    }),

  /* ---- auth + users ----------------------------------------------------- */
  login: (email: string, password: string) =>
    request<{ token: string; user: UserRecord }>("/auth/login", { method: "POST", body: { email, password } }),
  register: (email: string, password: string, displayName?: string) =>
    request<{ token: string; user: UserRecord }>("/auth/register", {
      method: "POST",
      body: { email, password, display_name: displayName },
    }),
  me: () => request<{ user: UserRecord }>("/auth/me"),
  users: (limit = 200) =>
    request<{ users: UserRecord[]; statistics: { total: number; active: number; by_role: Record<string, number>; by_tier: Record<string, number> } }>(
      `/users${qs({ limit })}`,
    ),
  createUser: (body: { email: string; password: string; role: string; tier: string; display_name?: string }) =>
    request<{ user: UserRecord }>("/users", { method: "POST", body }),
  updateUser: (id: number, body: Record<string, unknown>) => request<{ user: UserRecord }>(`/users/${id}`, { method: "PUT", body }),
  deleteUser: (id: number) => request<{ deleted: number }>(`/users/${id}`, { method: "DELETE" }),

  /* ---- build steps + docs ----------------------------------------------- */
  buildSteps: () => request<BuildStepsResponse>("/platform/build-steps"),
  stepDoc: (slug: string) => request<string>(`/platform/doc/${slug}`),
  syncBuildSteps: () => request<{ synced: number }>("/platform/build-steps/sync", { method: "POST" }),
  overview: () => request<PlatformOverview>("/platform/overview"),
  docsIndex: () =>
    request<{ docs_dir: string; documents: { name: string; relative_path: string; size_bytes: number }[]; count: number }>(
      "/platform/docs",
    ),
  downloadUrl: (filename: string) => `${API_BASE_URL}${API_PREFIX}/platform/download/${filename}`,
};

export type Api = typeof api;
