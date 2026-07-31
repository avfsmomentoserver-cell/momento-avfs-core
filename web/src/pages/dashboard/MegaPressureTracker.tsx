/**
 * Mega Pressure Tracker v2.0 - Professional Dashboard
 * 
 * Commercial-grade pressure analysis dashboard with full-panel layout.
 * All features visible simultaneously with professional trading platform aesthetics.
 * 
 * Features:
 * - Real-time pressure metrics with gauge visualization
 * - Survival analysis ETA predictions with confidence intervals
 * - Semantic probability distribution for range analysis
 * - DNA similarity matching for pattern recognition
 * - EV guardrails and Kelly Criterion for chase strategy
 * - Honest accuracy validation with Brier scoring
 * - Historical timeline visualization
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp,
  Zap,
  Flame,
  BarChart3,
  Filter,
  RefreshCw,
  Clock,
  Target,
  AlertCircle,
  Activity,
  Gauge,
  LineChart,
  PieChart
} from 'lucide-react';

import {
  useMegaRounds,
  usePressureAnalysis,
  useBacktestResults,
  useETAPrediction,
  useRangePrediction,
  useBankrollRequirements,
  useChaseStrategy,
  useChaseBacktest,
  useSurvivalETA,
  useSemanticRange,
  useDNASimilarity,
  useEnhancedChase,
  useBrierScore,
  useForwardTest,
  type MegaRound,
  type PressureMetrics,
  type BacktestResult,
  type ETAPrediction,
  type RangePrediction,
  type BankrollRequirement,
  type ChaseStrategy,
  type ChaseConfig,
  type SurvivalETAPrediction,
  type SemanticRangePrediction,
  type DNASimilarityResult,
  type EnhancedChaseStrategy,
  type BrierScoreResult,
  type ForwardTestResult
} from '@/lib/invent-middleware/megaPressure';

const MegaPressureTracker: React.FC = () => {
  const [source, setSource] = useState('aviator');
  const [megaRange, setMegaRange] = useState<{ min: number; max: number }>({ min: 50, max: Infinity });
  const [chaseConfig, setChaseConfig] = useState<ChaseConfig>({ strategy: 'moderate' });
  const [advancedMode, setAdvancedMode] = useState(false);

  // Fetch data through middleware
  const megaRoundsQuery = useMegaRounds(source, megaRange);
  const pressureQuery = usePressureAnalysis(source, megaRange);
  const backtestConfig = { window_size: 1000, min_mega: 50 };
  const backtestQuery = useBacktestResults(source, backtestConfig);
  const etaQuery = useETAPrediction(source, megaRange);
  const rangeQuery = useRangePrediction(source, megaRange);
  const bankrollQuery = useBankrollRequirements(source, megaRange);
  const chaseStrategyQuery = useChaseStrategy(source, chaseConfig);
  const chaseBacktestQuery = useChaseBacktest(source, chaseConfig);

  // Advanced mode hooks
  const survivalEtaQuery = useSurvivalETA(source, megaRange);
  const semanticRangeQuery = useSemanticRange(source, megaRange);
  const dnaSimilarityQuery = useDNASimilarity(source, megaRange.max === Infinity ? null : megaRange.max);
  const enhancedChaseQuery = useEnhancedChase(source, chaseConfig.strategy, 1000, megaRange.min);
  const brierScoreQuery = useBrierScore(source, megaRange.min, 100);
  const forwardTestQuery = useForwardTest(source, megaRange.min, 500);

  const megaRounds = megaRoundsQuery.data || [];
  const pressureMetrics = pressureQuery.data;
  const backtestResults = backtestQuery.data;

  const isLoading = megaRoundsQuery.isLoading || pressureQuery.isLoading;

  const getPressureColor = (pressure: number) => {
    if (pressure >= 0.8) return 'text-red-500';
    if (pressure >= 0.6) return 'text-orange-500';
    if (pressure >= 0.4) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getPressureLevel = (pressure: number) => {
    if (pressure >= 0.8) return 'Critical';
    if (pressure >= 0.6) return 'High';
    if (pressure >= 0.4) return 'Moderate';
    return 'Low';
  };

  return (
    <div className="p-6 space-y-4 bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Flame className="w-7 h-7 text-orange-500" />
            Mega Pressure Tracker v2.0
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Professional pressure analysis dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={advancedMode ? "default" : "outline"}
            size="sm"
            onClick={() => setAdvancedMode(!advancedMode)}
            className={advancedMode ? "bg-indigo-600 hover:bg-indigo-700" : ""}
          >
            <Activity className="w-4 h-4 mr-2" />
            {advancedMode ? "Advanced ON" : "Advanced"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => megaRoundsQuery.refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="text-orange-400 border-orange-500">
            {source}
          </Badge>
        </div>
      </div>

      {/* Range Filter */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Mega Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Min Multiplier:</label>
              <select
                value={megaRange.min}
                onChange={(e) => setMegaRange({ ...megaRange, min: Number(e.target.value) })}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
              >
                <option value={50}>50x (Mega)</option>
                <option value={100}>100x (Cosmic)</option>
                <option value={500}>500x</option>
                <option value={1000}>1000x</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Max Multiplier:</label>
              <select
                value={megaRange.max === Infinity ? 'infinity' : megaRange.max}
                onChange={(e) => setMegaRange({ 
                  ...megaRange, 
                  max: e.target.value === 'infinity' ? Infinity : Number(e.target.value) 
                })}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
              >
                <option value="infinity">∞ (No limit)</option>
                <option value={100}>100x</option>
                <option value={500}>500x</option>
                <option value={1000}>1000x</option>
              </select>
            </div>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500">
              {megaRounds.length} mega rounds in range
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-400">Current Pressure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${getPressureColor(pressureMetrics?.current_pressure || 0)}`}>
              {pressureMetrics ? (pressureMetrics.current_pressure * 100).toFixed(0) : 'N/A'}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {pressureMetrics ? getPressureLevel(pressureMetrics.current_pressure) : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-400">Avg Mega Gap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-400">
              {pressureMetrics ? pressureMetrics.avg_mega_gap.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Rounds between megas</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-400">Mini Moonshots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-400">
              {pressureMetrics ? pressureMetrics.avg_mini_moonshots.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per mega gap</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-400">Pressure Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-400">
              {backtestResults ? (backtestResults.pressure_accuracy * 100).toFixed(0) : 'N/A'}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Backtest validation</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-12 gap-3">
        {/* Panel 1: Pressure Overview (3 cols) */}
        <div className="col-span-12 md:col-span-3">
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-orange-500" />
                Pressure Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!pressureMetrics ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Loading pressure data...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="text-xs text-gray-500 mb-1">Energy Buildup</div>
                    <div className="text-lg font-bold text-orange-400">{pressureMetrics.energy_buildup.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="text-xs text-gray-500 mb-1">Shape Consistency</div>
                    <div className="text-lg font-bold text-blue-400">{pressureMetrics.shape_consistency.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="text-xs text-gray-500 mb-1">Band Momentum</div>
                    <div className="text-lg font-bold text-purple-400">{pressureMetrics.band_momentum.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="text-xs text-gray-500 mb-1">Time Decay</div>
                    <div className="text-lg font-bold text-cyan-400">{pressureMetrics.time_decay.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel 2: ETA Forecast (3 cols) */}
        <div className="col-span-12 md:col-span-3">
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-500" />
                ETA Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {advancedMode ? (
                !survivalEtaQuery.data ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Loading survival ETA...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-500 mb-1">Predicted ETA</div>
                      <div className="text-lg font-bold text-cyan-400">{survivalEtaQuery.data.rounds_eta.toFixed(1)} rounds</div>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-500 mb-1">95% Confidence</div>
                      <div className="text-sm text-gray-300">{survivalEtaQuery.data.confidence_95.min_rounds.toFixed(0)} - {survivalEtaQuery.data.confidence_95.max_rounds.toFixed(0)} rounds</div>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-500 mb-1">Hazard Rate</div>
                      <div className="text-lg font-bold text-orange-400">{survivalEtaQuery.data.hazard_rate.toFixed(4)}</div>
                    </div>
                  </div>
                )
              ) : (
                !etaQuery.data ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Loading ETA...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-500 mb-1">Predicted ETA</div>
                      <div className="text-lg font-bold text-cyan-400">{etaQuery.data.rounds_eta.toFixed(0)} rounds</div>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-500 mb-1">95% Confidence</div>
                      <div className="text-sm text-gray-300">{etaQuery.data.confidence_95.min_rounds.toFixed(0)} - {etaQuery.data.confidence_95.max_rounds.toFixed(0)} rounds</div>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel 3: Range Analysis (3 cols) */}
        <div className="col-span-12 md:col-span-3">
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Target className="w-4 h-4 text-pink-500" />
                Range Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {advancedMode ? (
                !semanticRangeQuery.data ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Loading semantic range...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-500 mb-1">Predicted Range</div>
                      <div className="text-lg font-bold text-pink-400">{semanticRangeQuery.data.predicted_range.min.toFixed(0)}x - {semanticRangeQuery.data.predicted_range.max.toFixed(0)}x</div>
                    </div>
                    {semanticRangeQuery.data.semantic_weights.map((prob, idx) => (
                      <div key={idx} className="p-2 bg-slate-800 rounded border border-slate-700">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">{prob.band}</span>
                          <span className="text-gray-300">{(prob.probability_mass * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                          <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${prob.probability_mass * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                !rangeQuery.data ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Loading range...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-500 mb-1">Predicted Range</div>
                      <div className="text-lg font-bold text-pink-400">{rangeQuery.data.predicted_range.min.toFixed(0)}x - {rangeQuery.data.predicted_range.max.toFixed(0)}x</div>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-500 mb-1">Historical Accuracy</div>
                      <div className="text-sm text-gray-300">{(rangeQuery.data.historical_accuracy * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel 4: DNA Similarity (3 cols) */}
        <div className="col-span-12 md:col-span-3">
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <LineChart className="w-4 h-4 text-indigo-500" />
                DNA Similarity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!advancedMode ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Enable Advanced Mode for DNA analysis
                </div>
              ) : !dnaSimilarityQuery.data ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Loading DNA similarity...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="text-xs text-gray-500 mb-1">Predicted Range</div>
                    <div className="text-lg font-bold text-indigo-400">{dnaSimilarityQuery.data.predicted_multiplier_range.min.toFixed(0)}x - {dnaSimilarityQuery.data.predicted_multiplier_range.max.toFixed(0)}x</div>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="text-xs text-gray-500 mb-1">Confidence</div>
                    <div className="text-lg font-bold text-purple-400">{(dnaSimilarityQuery.data.confidence_score * 100).toFixed(0)}%</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">Top Matches:</div>
                    {dnaSimilarityQuery.data.top_matches.slice(0, 2).map((match, idx) => (
                      <div key={idx} className="p-2 bg-slate-800 rounded border border-slate-700">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">#{idx + 1}</span>
                          <span className="text-indigo-400">{(match.similarity_score * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Middle Row: Chase Strategy & Validation (6 cols each) */}
      <div className="grid grid-cols-12 gap-3">
        {/* Panel 5: Chase Strategy (6 cols) */}
        <div className="col-span-12 md:col-span-6">
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Chase Strategy
                {advancedMode && <Badge className="bg-indigo-600 text-xs">EV Guardrails</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs text-gray-400">Strategy:</label>
                <select
                  value={chaseConfig.strategy}
                  onChange={(e) => setChaseConfig({ ...chaseConfig, strategy: e.target.value as 'conservative' | 'moderate' | 'aggressive' })}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                >
                  <option value="conservative">Conservative</option>
                  <option value="moderate">Moderate</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
              {advancedMode ? (
                !enhancedChaseQuery.data ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Loading enhanced chase...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                        <div className="text-xs text-gray-500 mb-1">Base Bet</div>
                        <div className="text-lg font-bold text-yellow-400">{enhancedChaseQuery.data.base_bet.toFixed(2)}</div>
                      </div>
                      <div className={`p-3 rounded-lg border ${enhancedChaseQuery.data.ev_guardrail.should_bet ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
                        <div className="text-xs text-gray-500 mb-1">Expected Value</div>
                        <div className={`text-lg font-bold ${enhancedChaseQuery.data.ev_guardrail.should_bet ? 'text-green-400' : 'text-red-400'}`}>
                          {enhancedChaseQuery.data.ev_guardrail.expected_value.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-500 mb-2">EV Guardrail Analysis</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Kelly Fraction:</span>
                          <span className="text-indigo-400">{(enhancedChaseQuery.data.ev_guardrail.kelly_fraction * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Risk-Adjusted EV:</span>
                          <span className="text-purple-400">{enhancedChaseQuery.data.ev_guardrail.risk_adjusted_ev.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Position Size:</span>
                          <span className="text-green-400">{enhancedChaseQuery.data.ev_guardrail.recommended_position_size.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Max Loss:</span>
                          <span className="text-red-400">{enhancedChaseQuery.data.ev_guardrail.max_loss.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                !chaseStrategyQuery.data ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Loading chase strategy...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="text-xs text-gray-500 mb-1">{chaseStrategyQuery.data.name}</div>
                      <p className="text-xs text-gray-300">{chaseStrategyQuery.data.description}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2 bg-slate-800 rounded border border-slate-700">
                        <div className="text-xs text-gray-500">Max Rounds</div>
                        <div className="text-sm font-bold text-red-400">{chaseStrategyQuery.data.parameters.max_chase_rounds}</div>
                      </div>
                      <div className="p-2 bg-slate-800 rounded border border-slate-700">
                        <div className="text-xs text-gray-500">Stop Loss</div>
                        <div className="text-sm font-bold text-orange-400">{chaseStrategyQuery.data.parameters.stop_loss_multiplier}x</div>
                      </div>
                      <div className="p-2 bg-slate-800 rounded border border-slate-700">
                        <div className="text-xs text-gray-500">Profit Target</div>
                        <div className="text-sm font-bold text-green-400">{chaseStrategyQuery.data.parameters.profit_target_multiplier}x</div>
                      </div>
                      <div className="p-2 bg-slate-800 rounded border border-slate-700">
                        <div className="text-xs text-gray-500">Bet Growth</div>
                        <div className="text-sm font-bold text-blue-400">{chaseStrategyQuery.data.parameters.bet_growth_rate}x</div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel 6: Validation Metrics (6 cols) */}
        <div className="col-span-12 md:col-span-6">
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-500" />
                Validation Metrics
                {advancedMode && <Badge className="bg-indigo-600 text-xs">Honest Validation</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {advancedMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">Brier Score</div>
                      <div className="text-sm font-bold text-indigo-400">{brierScoreQuery.data?.brier_score.toFixed(4) || 'N/A'}</div>
                    </div>
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">Calibration Error</div>
                      <div className="text-sm font-bold text-orange-400">{brierScoreQuery.data?.calibration_error.toFixed(4) || 'N/A'}</div>
                    </div>
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">Resolution</div>
                      <div className="text-sm font-bold text-green-400">{brierScoreQuery.data?.resolution.toFixed(4) || 'N/A'}</div>
                    </div>
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">Sample Size</div>
                      <div className="text-sm font-bold text-blue-400">{brierScoreQuery.data?.sample_size || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">Accuracy</div>
                      <div className="text-sm font-bold text-green-400">{forwardTestQuery.data ? (forwardTestQuery.data.accuracy * 100).toFixed(1) + '%' : 'N/A'}</div>
                    </div>
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">Profit/Loss</div>
                      <div className={`text-sm font-bold ${forwardTestQuery.data?.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {forwardTestQuery.data?.profit_loss.toFixed(2) || 'N/A'}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">Max Drawdown</div>
                      <div className="text-sm font-bold text-red-400">{forwardTestQuery.data?.max_drawdown.toFixed(2) || 'N/A'}</div>
                    </div>
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">Sharpe Ratio</div>
                      <div className="text-sm font-bold text-purple-400">{forwardTestQuery.data?.sharpe_ratio.toFixed(3) || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">Pressure Accuracy</div>
                      <div className="text-sm font-bold text-green-400">{backtestResults ? (backtestResults.pressure_accuracy * 100).toFixed(0) + '%' : 'N/A'}</div>
                    </div>
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">Mega Prediction Rate</div>
                      <div className="text-sm font-bold text-purple-400">{backtestResults ? (backtestResults.mega_prediction_rate * 100).toFixed(0) + '%' : 'N/A'}</div>
                    </div>
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">False Positive Rate</div>
                      <div className="text-sm font-bold text-red-400">{backtestResults ? (backtestResults.false_positive_rate * 100).toFixed(0) + '%' : 'N/A'}</div>
                    </div>
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <div className="text-xs text-gray-500">Tested Rounds</div>
                      <div className="text-sm font-bold text-blue-400">{backtestResults?.tested_rounds || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row: Timeline Charts (12 cols) */}
      <div className="col-span-12">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Pressure Timeline & Mega Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-orange-400 opacity-50" />
                <p className="text-gray-400 text-sm">Pressure Timeline Visualization</p>
                <p className="text-xs text-gray-500 mt-1">
                  {pressureMetrics?.pressure_history.length || 0} data points
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MegaPressureTracker;
