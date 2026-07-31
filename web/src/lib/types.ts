/** Shared DTOs mirroring the Python backend response models. */

export type MarketState =
  | "Normal"
  | "Collapse"
  | "Ignition"
  | "Moonshot"
  | "Exhaustion"
  | "Shelf"
  | "Bait"
  | "Idle";

export interface RoundRecord {
  id: number;
  source: string;
  timestamp: string;
  multiplier: number;
  color?: string | null;
  band?: string | null;
  points?: number | null;
  ingest_method?: string | null;
  created_at?: string | null;
}

export interface RoundsResponse {
  rounds: RoundRecord[];
  total: number;
  limit: number;
  offset: number;
  source: string;
}

export interface LadderSignal {
  active: boolean;
  length?: number;
  run?: number;
  floor?: number;
  floor_points?: number;
  ceiling?: number;
  ceiling_points?: number;
  pressure?: number;
  strength: number;
  slope?: number;
  breakout_pct?: number;
}

export interface NestedSignal {
  detected: boolean;
  slope: number;
  rounds: number;
  compression: number;
  early_spread?: number;
  late_spread?: number;
}

export interface ShelfSignal {
  active: boolean;
  variance: number;
  normalized_variance?: number;
  strength: number;
  level: number;
  rounds: number;
}

export interface BaitSignal {
  active: boolean;
  strength: number;
  spike: number;
  context_mean: number;
  ratio?: number;
  weak_neighbours?: number;
}

export interface GapSwingSignal {
  gaps: number[];
  mean_gap: number;
  mean_up?: number;
  mean_down?: number;
  max_swing: number;
  net: number;
  direction: "up" | "down" | "flat";
  swing_score: number;
  up_ratio?: number;
}

export interface ResistanceLevel {
  points: number;
  multiplier: number;
  touches: number;
  weight: number;
  band: string;
}

export interface ResistanceSignal {
  levels: ResistanceLevel[];
  recently_cleared: number;
  nearest: ResistanceLevel | null;
  pressure: number;
  current_points?: number;
}

export interface Signals {
  ascending_ladder?: LadderSignal;
  collapse_ladder?: LadderSignal;
  nested?: NestedSignal;
  shelf?: ShelfSignal;
  bait?: BaitSignal;
  gap_swing?: GapSwingSignal;
  upper_resistance?: ResistanceSignal;
  trend?: string;
}

export interface StreakInfo {
  current_low_streak: number;
  current_high_streak: number;
  longest_low_streak: number;
  longest_high_streak: number;
  avg_low_streak?: number;
  avg_high_streak?: number;
  threshold: number;
  runs: { kind: "low" | "high"; length: number }[];
}

export type Distribution = Record<string, number>;

export interface BandHistogramEntry {
  band: string;
  label: string;
  color: string;
  lo: number;
  hi: number | null;
  count: number;
  share: number;
}

export interface Percentiles {
  p05?: number;
  p10?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  p95?: number;
  p99?: number;
}

export interface BandExhaustionEntry {
  threshold: number;
  label: string;
  hits: number;
  rate: number;
  expected_gap: number | null;
  observed_gap: number | null;
  rounds_since: number;
  overdue_ratio: number;
  exhaustion: number;
  status: "overdue" | "due" | "fresh";
}

export interface BandExhaustion {
  bands: BandExhaustionEntry[];
  most_overdue: BandExhaustionEntry | null;
}

export interface Regime {
  regime: string;
  confidence: number;
  volatility: number;
  drift: number;
  window?: number;
}

export interface HouseEdge {
  estimate: number;
  estimate_pct?: number;
  expected_rtp_pct?: number;
  confidence: number;
  samples: number;
  instant_bust_rate: number;
  fits: { threshold: number; observed_survival: number; fair_survival: number; implied_edge: number }[];
  note?: string;
}

export interface DnaMatch {
  index: number;
  similarity: number;
  next_multiplier: number;
  next_band: string;
  signature: string[];
}

export interface DnaReport {
  signature: string[];
  signature_labels?: string[];
  matches: DnaMatch[];
  match_count: number;
  outcomes: {
    count?: number;
    mean?: number;
    median?: number;
    p75?: number;
    p90?: number;
    over_2x?: number;
    over_5x?: number;
    over_10x?: number;
  };
  confidence: number;
  tolerance?: number;
  note?: string;
}

export interface SessionSummary {
  active: boolean;
  rounds_available: number;
  count: number;
  sessions_total?: number;
  avg_round_secs: number;
  duration_secs?: number;
  started_at?: string | null;
  ended_at?: string | null;
  peak?: number;
  mean?: number;
  median?: number;
  volatility?: number;
}

export interface PredictionCandidate {
  state: MarketState;
  probability: number;
  range_lo: number;
  range_hi: number;
  label: string;
  color: string;
  breakout_target?: number;
  note?: string;
  survival_estimate?: number;
}

export interface ForecastResult {
  predicted_state: MarketState;
  predicted_band: string;
  expected_multiplier?: number;
  confidence: number;
  confidence_label?: "HIGH" | "MEDIUM" | "LOW";
  range_lo: number;
  range_hi: number;
  horizon: number;
  candidates: PredictionCandidate[];
  transition_matrix?: Record<string, Record<string, number>>;
  components?: Record<string, unknown>;
  note?: string;
}

export interface AccuracyReport {
  overall: number;
  last_10: number;
  last_50: number;
  last_100?: number;
  total: number;
  by_state?: Record<string, { total: number; hits: number; accuracy: number }>;
  brier?: number;
  calibration?: number;
}

export interface WarningEntry {
  level: "high" | "medium" | "low";
  code: string;
  message: string;
}

export interface TransitionEntry {
  from: string;
  to: string;
  round_id: number | null;
  timestamp: string | null;
  multiplier: number;
  index: number;
}

export interface MoonshotEta {
  label: string;
  threshold: number;
  expected_gap: number;
  rounds_since: number;
  rounds_remaining: number;
  eta_seconds: number | null;
  overdue: boolean;
  overdue_ratio: number;
  ripeness: number;
  status: string;
}

export interface MegaScore {
  range: number;
  rounds: number;
  score: number;
  grade: "A" | "B" | "C" | "D";
  peak: number;
  overdue_band?: string | null;
  overdue_ratio?: number;
  compression?: number;
}

export interface MlPredictions {
  available: boolean;
  note?: string;
  features: Record<string, number>;
  predictions: Record<string, { model: number; empirical: number; blended: number; edge: number }>;
  samples?: number;
  model?: string;
}

export interface AnalysisPayload {
  source: string | null;
  generated_at?: string;
  state: MarketState;
  state_scores: Record<string, number>;
  state_meta: { tone: string; color: string; meaning: string };
  narrative: string;
  shape?: string;
  prediction_confidence: {
    confidence: number;
    moonshot_probability: number;
    ignition_probability: number;
  };
  signals: Signals;
  streaks?: StreakInfo;
  distribution: Distribution;
  band_histogram: BandHistogramEntry[];
  percentiles: Percentiles;
  band_exhaustion?: BandExhaustion;
  resistance_pressure?: { pressure: number; nearest: ResistanceLevel | null; recently_cleared: number };
  regime?: Regime;
  house_edge?: HouseEdge;
  dna_report?: DnaReport;
  session: SessionSummary;
  latest: { multiplier: number; band: string; points?: number; energy?: string; timestamp?: string | null };
  warnings: WarningEntry[];
  config: Record<string, number>;
  forecast?: ForecastResult | null;
  predictions: PredictionCandidate[];
  transitions: TransitionEntry[];
  accuracy: AccuracyReport;
  moonshot_eta?: MoonshotEta[];
  mega_scores?: MegaScore[];
  ml?: MlPredictions;
  engines?: Record<string, boolean>;
  pending_forecasts?: number;
  empty?: boolean;
  advanced_features?: AdvancedFeatures;
  alerts?: Array<{ level: string; code: string; message: string; feature?: string }>;
}

export interface SourceInfo {
  id: string;
  name: string;
  icon: string;
  active: boolean;
  round_count: number;
  latest_timestamp: string | null;
  latest_multiplier: number | null;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  peak_multiplier: number;
  mean_multiplier: number;
  first_round_id: number;
  last_round_id: number;
}

export interface PointSample {
  id: number;
  time: string;
  multiplier: number;
  points: number;
  band: string;
  band_label: string;
  color: string;
  floor: number;
  ceiling: number;
  mean: number;
}

export interface PhaseSample {
  id: number;
  time: string;
  multiplier: number;
  points: number;
  phase: MarketState;
  phase_color: string;
  ascending_strength: number;
  collapse_strength: number;
}

export interface PluginPerformance {
  signal_count: number;
  accuracy: number;
  processing_time: number;
}

export interface PluginRecord {
  id: string;
  name: string;
  version: string;
  author: string | null;
  description: string | null;
  category: string;
  enabled: boolean;
  builtin: boolean;
  status: string;
  runnable: boolean;
  config: Record<string, unknown>;
  created_at: string;
  performance: PluginPerformance;
  last_used: string | null;
}

export interface PluginStatistics {
  total_plugins: number;
  active_plugins: number;
  enabled_plugins: number;
  builtin_plugins: number;
  custom_plugins: number;
  category_breakdown: Record<string, number>;
  average_accuracy: number;
  average_processing_time: number;
  total_signals_generated: number;
  available_bases: { id: string; name: string; category: string; config: Record<string, number> }[];
}

export interface PluginRunResult {
  plugin_id: string;
  name: string;
  category: string;
  signal: string;
  score: number;
  detail?: string;
  processing_ms: number;
  error?: string | null;
  [key: string]: unknown;
}

export interface OrchestratorModule {
  id: string;
  label: string;
  description: string;
  min_confidence: number;
  size_multiplier: number;
  target_multiplier: number;
  max_consecutive_losses: number;
  patience_bias: number;
}

export interface OrchestratorPlan {
  source?: string;
  module: OrchestratorModule;
  modules_available: OrchestratorModule[];
  settings: Record<string, string | number>;
  instruction: {
    action: "ENTER" | "PREPARE" | "WAIT" | "STAND_DOWN";
    headline: string;
    detail: string;
    target_multiplier: number;
    stop_multiplier: number;
    position_size: number;
    confidence: number;
    confidence_label: "HIGH" | "MEDIUM" | "LOW";
  };
  patience: { wait_rounds: number; verdict: string; reason: string; patience_bias: number };
  speed: { tempo: string; avg_round_secs: number; exit_window_secs: number | null; execution_delay_ms: number; reason: string };
  risk: {
    position_size: number;
    suggested_size: number;
    max_risk_per_round: number;
    daily_loss_limit: number;
    sizing_method: string;
    risk_level: string;
    blocked: boolean;
    blocks: string[];
    bankroll: number;
  };
  mistake_prevention: { code: string; severity: "high" | "medium" | "low"; message: string }[];
  state?: MarketState;
  narrative?: string;
  generated_at?: string;
}

export interface AutopilotDecision {
  id: number;
  round_id: number | null;
  timestamp: string;
  action: string;
  position_size: number;
  entry_point: number;
  exit_point: number;
  stop_loss: number;
  confidence: number;
  primary_signal: string | null;
  contributing_signals: { name: string; score: number; weight: number }[];
  risk_assessment: Record<string, unknown>;
  resolved: boolean;
  pnl: number | null;
  won: boolean | null;
  resolved_at: string | null;
}

export interface AutopilotStatus {
  is_active: boolean;
  source: string;
  current_position: number | null;
  risk_level: string;
  last_decision: AutopilotDecision | null;
  config: Record<string, string | number | boolean>;
  total_trades: number;
  daily_trades: number;
  win_rate: number;
  total_pnl: number;
  daily_pnl: number;
  consecutive_losses: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number | null;
  pending: number;
}

export interface EquityPoint {
  index: number;
  time: string;
  pnl: number;
  equity: number;
  action: string;
  confidence: number;
}

export interface UserRecord {
  id: number;
  email: string;
  role: "user" | "analyst" | "operator" | "admin";
  tier: "free" | "premium" | "pro";
  display_name: string | null;
  created_at: string;
  last_login: string | null;
  active: boolean;
  is_operator: boolean;
  is_premium: boolean;
}

export interface WatcherStatus {
  running: boolean;
  inbox_dir: string;
  processed_dir: string;
  failed_dir: string;
  downloads_dir: string;
  watch_downloads: boolean;
  interval_seconds: number;
  files_processed: number;
  files_failed: number;
  rounds_imported: number;
  pending_files: number;
  last_scan: number | null;
  last_error: string | null;
  accepted_suffixes: string[];
}

export interface FeedStatus {
  running: boolean;
  started_at: string | null;
  rounds_emitted: number;
  cursor: number;
  chain_length: number;
  chain_remaining: number;
  last_multiplier: number | null;
  last_seed: string | null;
  last_error: string | null;
  salt: string;
  config: { source: string; interval_seconds: number; house_edge: number; jitter: number };
  verification: { scheme: string; terminal_seed_published: boolean; terminal_seed: string | null };
}

export interface IngestLogEntry {
  id: number;
  filename: string | null;
  method: string;
  status: string;
  source: string | null;
  imported: number;
  duplicates: number;
  rejected: number;
  message: string | null;
  created_at: string;
}

export interface HealthReport {
  status: string;
  version: string;
  uptime_seconds: number;
  database: {
    counts: Record<string, number>;
    size_bytes: number;
    path: string;
    newest_round: string | null;
    oldest_round: string | null;
  };
  websocket: { clients: number; messages_sent: number };
  watcher: WatcherStatus;
  feed: FeedStatus;
  python: string;
  host: string;
  config: Record<string, string | boolean | string[]>;
  timestamp: string;
}

export interface EnginesHealth {
  status: string;
  engines: { name: string; enabled: boolean; status: string }[];
  plugins: { total: number; active: number; signals_generated: number };
  data: { sources: number; total_rounds: number };
  timestamp: string;
}

export interface BuildStepFile {
  name: string | null;
  size_bytes: number;
  exists: boolean;
  url: string | null;
  view_url?: string | null;
}

export interface BuildStep {
  slug: string;
  ordinal: number;
  title: string;
  summary: string;
  status: string;
  highlights: string[];
  doc: BuildStepFile;
  bundle: BuildStepFile;
}

export interface BuildStepsResponse {
  generated_at: string | null;
  steps: BuildStep[];
  downloads_dir: string;
  full_bundle: (BuildStepFile & { url: string }) | null;
  total_steps: number;
}

export interface SubProject {
  id: string;
  name: string;
  description: string;
  surface: string;
  engines: string[];
}

export interface PlatformOverview {
  platform: string;
  pipeline: string[];
  sub_projects: SubProject[];
  database: HealthReport["database"];
}

export interface LinguisticsBand {
  key: string;
  label: string;
  lo: number;
  hi: number | null;
  color: string;
}

export interface LinguisticsPayload {
  source: string;
  bands: LinguisticsBand[];
  states: { state: string; tone: string; color: string; meaning: string }[];
  current: { state: string; narrative: string; shape: string; latest: Record<string, unknown> };
  tokens: { multiplier: number; band: string; band_label: string; points: number; energy: string; color: string }[];
}

export interface CalibrationStatus {
  source: string;
  accuracy: AccuracyReport;
  pending_forecasts: number;
  calibrated: boolean;
  last_run: string | null;
  last_score: number | null;
  settings: Record<string, number>;
}

export interface WsEnvelope<T = unknown> {
  type: string;
  payload: T;
  timestamp?: string;
}

/* -------------------------------------------------------------------------- */
/* analyzer + inspector response shapes                                       */
/* -------------------------------------------------------------------------- */

export interface ResistanceResponse {
  source: string;
  resistance: ResistanceSignal;
  collapse_ladder: LadderSignal;
  ascending_ladder: LadderSignal;
  nested: NestedSignal;
  shelf: ShelfSignal;
}

export interface CeilingAnalyzerResponse {
  source: string;
  analyzer: string;
  signal: string;
  score: number;
  ceiling: number;
  run: number;
  breakout_pct: number;
  detail: string;
  nearest_resistance: ResistanceLevel | null;
  recently_cleared: number;
}

export interface GapSwingAnalyzerResponse {
  source: string;
  analyzer: string;
  signal: string;
  score: number;
  direction: string;
  net: number;
  mean_gap: number;
  max_swing: number;
  up_ratio: number;
  detail: string;
  detail_series: GapSwingSignal;
}

export interface LinguisticsToken {
  multiplier: number;
  band: string;
  band_label: string;
  points: number;
  energy: string;
  color: string;
}

export interface ExplainResponse {
  multiplier: number;
  token: LinguisticsToken;
  layers: Record<string, Record<string, unknown>>;
  next_band: { key: string; label: string; lo: number } | null;
}

export interface CalibrationRunResponse {
  calibrated: boolean;
  source: string;
  reason?: string;
  before?: Record<string, number>;
  after?: Record<string, number>;
  changed?: Record<string, number>;
  percentiles?: Percentiles;
  accuracy?: AccuracyReport;
  samples?: number;
  settings?: Record<string, number>;
}

export interface BacktestResponse {
  ran: boolean;
  source: string;
  reason?: string;
  horizon?: number;
  tested?: number;
  hits?: number;
  accuracy?: number;
  by_state?: Record<string, { tested: number; hits: number; accuracy: number }>;
  samples?: number;
}

export interface BacktestRun {
  id: number;
  source: string;
  config: BacktestConfig;
  status: "pending" | "running" | "completed" | "error";
  total_sessions: number;
  sessions_tested: number;
  baseline_accuracy: number | null;
  feature_accuracy: number | null;
  impact_score: number | null;
  results?: BacktestResults | null;
  error?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface BacktestConfig {
  session_gap?: number;
  window_size?: number;
  min_session_rounds?: number;
  max_rounds?: number;
  ingest_method?: string;
  feature_toggles?: Record<string, boolean>;
}

export interface BacktestResults {
  baseline: BacktestSessionResult[];
  feature?: BacktestSessionResult[] | null;
}

export interface BacktestSessionResult {
  predictions: unknown[];
  state: string;
  state_scores: Record<string, number>;
  confidence: Record<string, number>;
  rounds_count: number;
}

export interface ForecastLedgerRow {
  id: number;
  created_at: string;
  anchor_round_id: number | null;
  horizon: number;
  predicted_state: string;
  predicted_band: string | null;
  confidence: number;
  range_lo: number;
  range_hi: number;
  engine: string;
  resolved: number;
  correct: number | null;
  actual_multiplier: number | null;
  resolved_at: string | null;
}

/* -------------------------------------------------------------------------- */
/* Advanced Features Types                                                      */
/* -------------------------------------------------------------------------- */

export interface PressureCeiling {
  level: number;
  archetype: string;
  touches: number;
  first_touch_index: number;
  last_touch_index: number;
}

export interface PressureData {
  pressure_percent: number;
  pressure_by_ceiling: Array<{
    ceiling: PressureCeiling;
    pressure: number;
    distance: number;
  }>;
  dominant_ceiling: PressureCeiling | null;
  release_probability: number;
  imminent_ranges: number[][];
  status: "critical" | "high" | "moderate" | "low";
}

export interface MomentumShift {
  index: number;
  momentum: number;
  direction: "up" | "down";
  magnitude: number;
}

export interface BaselineData {
  values: number[];
  trendlines: {
    short: number[];
    long: number[];
    momentum: number[];
  };
  shifts: MomentumShift[];
}

export interface MoonshotFactor {
  pressure: number;
  momentum_distance_20x: { distance: number; metric: string; found: boolean };
  momentum_distance_10x: { distance: number; metric: string; found: boolean };
  ceiling_proximity: number;
  band_transition: Record<string, unknown>;
  compression: number;
}

export interface MoonshotPattern {
  pattern: string[];
  confidence: number;
  occurrences: number;
  avg_outcome: number;
}

export interface MoonshotData {
  imminent: boolean;
  confidence: number;
  factors: MoonshotFactor;
  patterns: {
    patterns: MoonshotPattern[];
    confidence: number;
  };
  historical_moonshots: number;
  distance_targets: number[];
  eta_data?: {
    range_predictions: RangeETAPrediction[];
    overall_confidence: number;
    note: string;
  };
  release_window?: {
    min: number | null;
    max: number | null;
    std: number | null;
  };
  eta_adjustment?: number;
}

export interface RangeETAPrediction {
  target: number;
  expected_rounds: number | null;
  hold_probability: number;
  confidence: number;
  release_window: {
    min: number | null;
    max: number | null;
    std: number | null;
  } | null;
  rounds_since: number;
  found: boolean;
  hit_count?: number;
}

export interface LadderSequence {
  start_index: number;
  end_index: number;
  length: number;
  collapse_point: number;
}

export interface BandLadderData {
  sequences: LadderSequence[];
  collapse_points: number[];
  avg_ladder_length: number;
  collapse_frequency: number;
  total_sequences: number;
}

export interface BandTransition {
  from_band: string;
  to_band: string;
  probability: number;
  count: number;
}

export interface BandRelativityData {
  transition_matrix: Record<string, Record<string, number>>;
  correlation_matrix: Record<string, Record<string, number>>;
  lead_lag: Record<string, { lead: string; lag: string; correlation: number }>;
  synchronization: number;
}

export interface BandAnalysisData {
  [bandName: string]: BandLadderData;
}

export interface AdvancedFeatures {
  pressure?: PressureData;
  baseline?: BaselineData;
  moonshot?: MoonshotData;
  bands?: BandAnalysisData;
  band_relativity?: BandRelativityData;
  error?: string;
}