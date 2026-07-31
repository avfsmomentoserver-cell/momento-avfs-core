/**
 * Mega Pressure Tracker - Advanced Invention
 * 
 * Intelligently calculates and represents mini moonshot pressure and related factors
 * between mega rounds (50x+), using the new linguistics system.
 * 
 * Features:
 * - Pressure calculation based on energy buildup between mega events
 * - Mini moonshot tracking (ignition/moonshot bands between megas)
 * - Range filtering by mega multipliers (e.g., 50x-100x, 100x-500x, 500x+)
 * - Backtest integration for historical pressure analysis
 * - Charts showing pressure trends, mega distribution, and patterns
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Activity
} from 'lucide-react';

import {
  useMegaRounds,
  usePressureAnalysis,
  useBacktestResults,
  useLatestSessionTopRounds,
  useTopRoundsByDay,
  useETAPrediction,
  useRangePrediction,
  useBankrollRequirements,
  useChaseStrategy,
  useChaseBacktest,
  type MegaRound,
  type PressureMetrics,
  type BacktestResult,
  type TopRound,
  type TopRoundsData,
  type ETAPrediction,
  type RangePrediction,
  type BankrollRequirement,
  type ChaseStrategy,
  type ChaseConfig
} from '@/lib/invent-middleware/megaPressure';

const MegaPressureTracker: React.FC = () => {
  const [source, setSource] = useState('aviator');
  const [activeTab, setActiveTab] = useState('pressure');
  const [megaRange, setMegaRange] = useState<{ min: number; max: number }>({ min: 50, max: Infinity });
  const [backtestConfig, setBacktestConfig] = useState({ window_size: 1000, min_mega: 50 });
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [fullscreen, setFullscreen] = useState(false);
  const [chaseConfig, setChaseConfig] = useState<ChaseConfig>({ strategy: 'moderate' });

  // Fetch data through middleware
  const megaRoundsQuery = useMegaRounds(source, megaRange, fullscreen);
  const pressureQuery = usePressureAnalysis(source, megaRange, fullscreen);
  const backtestQuery = useBacktestResults(source, backtestConfig, fullscreen);
  const topRoundsQuery = useLatestSessionTopRounds(source);
  const topRoundsByDayQuery = useTopRoundsByDay(source, selectedDay);
  const etaQuery = useETAPrediction(source, megaRange, fullscreen);
  const rangeQuery = useRangePrediction(source, megaRange, fullscreen);
  const bankrollQuery = useBankrollRequirements(source, megaRange, fullscreen);
  const chaseStrategyQuery = useChaseStrategy(source, chaseConfig, fullscreen);
  const chaseBacktestQuery = useChaseBacktest(source, chaseConfig, fullscreen);

  const megaRounds = megaRoundsQuery.data || [];
  const pressureMetrics = pressureQuery.data;
  const backtestResults = backtestQuery.data;
  const topRoundsData = topRoundsQuery.data;
  const topRoundsByDayData = topRoundsByDayQuery.data;

  const isLoading = megaRoundsQuery.isLoading || pressureQuery.isLoading || topRoundsQuery.isLoading;

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flame className="w-8 h-8 text-orange-500" />
            Mega Pressure Tracker
          </h1>
          <p className="text-gray-400 mt-1">
            Mini moonshot pressure analysis between mega events
          </p>
        </div>
        <div className="flex items-center gap-3">
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
      <Card className="bg-gray-900 border-gray-800">
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
            <Button
              variant={fullscreen ? "default" : "outline"}
              size="sm"
              onClick={() => setFullscreen(!fullscreen)}
              className={fullscreen ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {fullscreen ? 'Fullscreen On' : 'Fullscreen Off'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Current Pressure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPressureColor(pressureMetrics?.current_pressure || 0)}`}>
              {pressureMetrics ? (pressureMetrics.current_pressure * 100).toFixed(0) : 'N/A'}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {pressureMetrics ? getPressureLevel(pressureMetrics.current_pressure) : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Avg Mega Gap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {pressureMetrics ? pressureMetrics.avg_mega_gap.toFixed(0) : 'N/A'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Rounds between megas</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Mini Moonshots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {pressureMetrics ? pressureMetrics.avg_mini_moonshots.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per mega gap</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Pressure Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {backtestResults ? (backtestResults.pressure_accuracy * 100).toFixed(0) : 'N/A'}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Backtest validation</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gray-900 border-gray-800">
          <TabsTrigger value="pressure" className="data-[state=active]:bg-orange-600">
            <Flame className="w-4 h-4 mr-2" />
            Pressure Analysis
          </TabsTrigger>
          <TabsTrigger value="mega" className="data-[state=active]:bg-purple-600">
            <Zap className="w-4 h-4 mr-2" />
            Mega Distribution
          </TabsTrigger>
          <TabsTrigger value="mini" className="data-[state=active]:bg-blue-600">
            <Activity className="w-4 h-4 mr-2" />
            Mini Moonshots
          </TabsTrigger>
          <TabsTrigger value="top-rounds" className="data-[state=active]:bg-pink-600">
            <Target className="w-4 h-4 mr-2" />
            Top Rounds
          </TabsTrigger>
          <TabsTrigger value="backtest" className="data-[state=active]:bg-green-600">
            <BarChart3 className="w-4 h-4 mr-2" />
            Backtest Results
          </TabsTrigger>
        </TabsList>

        {/* Pressure Analysis Tab */}
        <TabsContent value="pressure" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Pressure Timeline</CardTitle>
              <CardDescription>
                Energy buildup and release between mega events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!pressureMetrics ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pressure data available</p>
                  <p className="text-sm mt-2">Waiting for mega rounds...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pressure Chart Placeholder */}
                  <div className="h-64 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-2 text-orange-400" />
                      <p className="text-gray-400">Pressure Chart Visualization</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {pressureMetrics.pressure_history.length} data points
                      </p>
                    </div>
                  </div>

                  {/* Pressure Factors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Energy Buildup</div>
                      <div className="text-xl font-bold text-orange-400">
                        {pressureMetrics.energy_buildup.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Shape Consistency</div>
                      <div className="text-xl font-bold text-blue-400">
                        {pressureMetrics.shape_consistency.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Band Momentum</div>
                      <div className="text-xl font-bold text-purple-400">
                        {pressureMetrics.band_momentum.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Time Decay</div>
                      <div className="text-xl font-bold text-green-400">
                        {pressureMetrics.time_decay.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mega Distribution Tab */}
        <TabsContent value="mega" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Mega Round Distribution</CardTitle>
              <CardDescription>
                Distribution and timing of mega events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {megaRounds.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No mega rounds in selected range</p>
                  <p className="text-sm mt-2">Adjust range filter or wait for data...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mega Distribution Chart Placeholder */}
                  <div className="h-64 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 text-purple-400" />
                      <p className="text-gray-400">Mega Distribution Chart</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {megaRounds.length} mega rounds
                      </p>
                    </div>
                  </div>

                  {/* Recent Mega Rounds */}
                  <div>
                    <h4 className="font-medium mb-3">Recent Mega Rounds</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {megaRounds.slice(0, 20).map((mega, index) => (
                        <div
                          key={mega.id}
                          className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500 w-6">{index + 1}</span>
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                              <Zap className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                              <div className="font-medium">{mega.crash_point.toFixed(2)}x</div>
                              <div className="text-xs text-gray-400">{mega.band}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">
                              {new Date(mega.timestamp).toLocaleString()}
                            </div>
                            {mega.gap_to_next !== null && (
                              <div className="text-xs text-gray-500">
                                Gap: {mega.gap_to_next} rounds
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mini Moonshots Tab */}
        <TabsContent value="mini" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Mini Moonshot Analysis</CardTitle>
              <CardDescription>
                Ignition and moonshot rounds between mega events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!pressureMetrics ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No mini moonshot data available</p>
                  <p className="text-sm mt-2">Waiting for analysis...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Mini Moonshot Distribution */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Ignition (10x-20x)</div>
                      <div className="text-xl font-bold text-cyan-400">
                        {pressureMetrics.mini_distribution.ignition}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Moonshot (20x-50x)</div>
                      <div className="text-xl font-bold text-blue-400">
                        {pressureMetrics.mini_distribution.moonshot}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Total Mini</div>
                      <div className="text-xl font-bold text-purple-400">
                        {pressureMetrics.mini_distribution.ignition + pressureMetrics.mini_distribution.moonshot}
                      </div>
                    </div>
                  </div>

                  {/* Pressure vs Mini Moonshots */}
                  <div className="h-64 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center">
                    <div className="text-center">
                      <Target className="w-12 h-12 mx-auto mb-2 text-blue-400" />
                      <p className="text-gray-400">Pressure vs Mini Moonshots</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Correlation analysis
                      </p>
                    </div>
                  </div>

                  {/* Mini Moonshot Patterns */}
                  <div>
                    <h4 className="font-medium mb-3">Mini Moonshot Patterns</h4>
                    <div className="space-y-2">
                      {pressureMetrics.mini_patterns.map((pattern, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-400" />
                            <span className="text-sm">{pattern.description}</span>
                          </div>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500">
                            {(pattern.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Rounds Tab */}
        <TabsContent value="top-rounds" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Top Rounds Analysis</CardTitle>
              <CardDescription>
                Session-based top rounds with 24hr interval mapping for moonshot tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!topRoundsData || topRoundsData.count === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No top rounds data available</p>
                  <p className="text-sm mt-2">Start the collector to extract top rounds...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Session Info */}
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div>
                      <div className="text-sm text-gray-400">Current Session</div>
                      <div className="font-medium text-pink-400">{topRoundsData.session_id || 'Latest Session'}</div>
                    </div>
                    <Badge className="bg-pink-500/20 text-pink-400 border-pink-500">
                      {topRoundsData.count} top rounds
                    </Badge>
                  </div>

                  {/* Day Filter */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-400">Filter by Day:</label>
                    <input
                      type="date"
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDay('')}
                    >
                      Clear
                    </Button>
                  </div>

                  {/* Top Rounds List */}
                  <div>
                    <h4 className="font-medium mb-3">
                      {selectedDay ? `Top Rounds for ${selectedDay}` : 'Latest Session Top Rounds'}
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {(selectedDay ? topRoundsByDayData?.top_rounds : topRoundsData.top_rounds)?.map((topRound, index) => (
                        <div
                          key={topRound.id}
                          className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500 w-6">{index + 1}</span>
                            <div className="p-2 bg-pink-500/20 rounded-lg">
                              <Target className="w-4 h-4 text-pink-400" />
                            </div>
                            <div>
                              <div className="font-medium">{topRound.multiplier.toFixed(2)}x</div>
                              <div className="text-xs text-gray-400">
                                {new Date(topRound.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">
                              Hour: {topRound.hour_interval}:00
                            </div>
                            <div className="text-xs text-gray-500">
                              {topRound.day_date}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 24hr Interval Distribution */}
                  <div>
                    <h4 className="font-medium mb-3">24hr Interval Distribution</h4>
                    <div className="grid grid-cols-12 gap-2">
                      {Array.from({ length: 24 }, (_, i) => {
                        const roundsInHour = (selectedDay ? topRoundsByDayData?.top_rounds : topRoundsData.top_rounds)
                          ?.filter(r => r.hour_interval === i).length || 0;
                        const intensity = Math.min(roundsInHour / 5, 1);
                        return (
                          <div
                            key={i}
                            className="text-center p-2 rounded bg-gray-800 border border-gray-700"
                            style={{
                              backgroundColor: intensity > 0 ? `rgba(236, 72, 153, ${intensity * 0.3})` : '',
                              borderColor: intensity > 0 ? `rgba(236, 72, 153, ${intensity})` : ''
                            }}
                          >
                            <div className="text-xs text-gray-400">{i}</div>
                            <div className="text-sm font-medium text-pink-400">{roundsInHour}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backtest Results Tab */}
        <TabsContent value="backtest" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Backtest Results</CardTitle>
              <CardDescription>
                Historical validation of pressure predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!backtestResults ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No backtest results available</p>
                  <p className="text-sm mt-2">Run backtest to validate pressure model...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Backtest Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Pressure Accuracy</div>
                      <div className="text-xl font-bold text-green-400">
                        {(backtestResults.pressure_accuracy * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Mega Prediction Rate</div>
                      <div className="text-xl font-bold text-purple-400">
                        {(backtestResults.mega_prediction_rate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">False Positive Rate</div>
                      <div className="text-xl font-bold text-red-400">
                        {(backtestResults.false_positive_rate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Tested Rounds</div>
                      <div className="text-xl font-bold text-blue-400">
                        {backtestResults.tested_rounds}
                      </div>
                    </div>
                  </div>

                  {/* Backtest Chart */}
                  <div className="h-64 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 text-green-400" />
                      <p className="text-gray-400">Backtest Performance Chart</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {backtestResults.tested_rounds} rounds tested
                      </p>
                    </div>
                  </div>

                  {/* Run Backtest Button */}
                  <div className="flex justify-center">
                    <Button
                      onClick={() => backtestQuery.refetch()}
                      disabled={backtestQuery.isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${backtestQuery.isLoading ? 'animate-spin' : ''}`} />
                      Run Backtest
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MegaPressureTracker;
