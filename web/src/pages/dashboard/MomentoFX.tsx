/**
 * MomentoFX Professional - Forex Crash Trading Interface
 * 
 * Professional-grade forex trading interface for crash games
 * Following gemini.md principles:
 * - Strict middleware pattern
 * - Professional Lightweight Charts integration
 * - AI-powered pattern recognition
 * - Advanced technical indicators
 * - Multi-timeframe analysis
 * - Professional UI/UX design
 * 
 * Target: Forex traders switching from MT5 with <5min learning curve
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  BarChart3,
  LineChart,
  Zap,
  Shield,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  Target,
  PieChart,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { ProfessionalCandleChart, convertToLightweightCandles } from '@/components/charts/ProfessionalCandleChart';
import { DrawingManager, useDrawingManager } from '@/components/charts/DrawingManager';
import { TimeframeManager, useTimeframeManager } from '@/components/charts/TimeframeManager';
import { multiplier } from '@/lib/format';
import { calculateAllIndicators, detectIndicatorSignals } from '@/lib/invent-middleware/technicalIndicators';
import { createPatternDetectionEngine } from '@/lib/invent-middleware/patternDetection';

import {
  useForexPairs,
  useLivePrices,
  useCrashGame,
  useCandles,
  useTechnicalAnalysis,
  usePatternDetection,
  usePortfolio,
  type ForexPair,
  type LivePrice,
  type CrashGame,
  type TechnicalIndicator,
  type Pattern,
  type Position,
  type DrawingTool,
  type Timeframe,
  type ExtendedCandleData,
  type VolumeData,
  type IndicatorLineData,
} from '@/lib/invent-middleware/momentoFX';

const MomentoFX: React.FC = () => {
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [activeTab, setActiveTab] = useState('live');
  const [betAmount, setBetAmount] = useState(100);
  const [autoCashout, setAutoCashout] = useState(2.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIndicators, setShowIndicators] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  // Use professional hooks
  const { activeTimeframe, handleTimeframeChange } = useTimeframeManager('15m', 'momentofx-timeframe');
  const {
    drawings,
    activeTool,
    setActiveTool,
    handleDrawingAdd,
    handleDrawingRemove,
    handleDrawingClear,
  } = useDrawingManager(selectedSource || '', activeTimeframe);

  // Pattern detection engine
  const patternEngine = createPatternDetectionEngine({
    minConfidence: 0.6,
    timeframe: activeTimeframe,
  });

  // Fetch data through middleware
  const pairsQuery = useForexPairs();
  const pricesQuery = useLivePrices(selectedSource || '');
  const crashGameQuery = useCrashGame(selectedSource || '');
  const candlesQuery = useCandles(selectedSource || '', activeTimeframe, 200);
  const analysisQuery = useTechnicalAnalysis(selectedSource || '', activeTimeframe);
  const patternsQuery = usePatternDetection(selectedSource || '', activeTimeframe);
  const portfolioQuery = usePortfolio(selectedSource || '');

  const pairs = pairsQuery.data || [];
  const livePrice = pricesQuery.data;
  const crashGame = crashGameQuery.data;
  const candles = candlesQuery.data || [];
  const indicators = analysisQuery.data;
  const patterns = patternsQuery.data;
  const portfolio = portfolioQuery.data;

  // Set default source on load
  useEffect(() => {
    if (pairs.length > 0 && !selectedSource) {
      setSelectedSource(pairs[0].id);
    }
  }, [pairs, selectedSource]);

  const isGameRunning = crashGame?.status === 'running';
  const currentMultiplier = crashGame?.current_multiplier || 1.0;

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier < 1.5) return 'text-green-400';
    if (multiplier < 3.0) return 'text-yellow-400';
    if (multiplier < 5.0) return 'text-orange-400';
    return 'text-red-400';
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-400" /> :
           trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-400" /> :
           <Activity className="w-4 h-4 text-gray-400" />;
  };

  // Convert candles to Lightweight Charts format
  const lightweightCandles = candles.length > 0 ? convertToLightweightCandles(candles as ExtendedCandleData[]) : [];

  // Generate indicator line data
  const indicatorData = new Map<string, IndicatorLineData[]>();
  if (showIndicators && candles.length > 0 && indicators) {
    // Add moving averages - convert time to Unix timestamp
    const ma20Data = candles.map((c, i) => {
      const time = typeof c.time === 'string' 
        ? Math.floor(new Date(c.time).getTime() / 1000)
        : c.time;
      return {
        time,
        value: i >= 19 ? candles.slice(i - 19, i + 1).reduce((sum, candle) => sum + candle.close, 0) / 20 : c.close,
      };
    });
    indicatorData.set('ma-20', ma20Data);

    const ma50Data = candles.map((c, i) => {
      const time = typeof c.time === 'string' 
        ? Math.floor(new Date(c.time).getTime() / 1000)
        : c.time;
      return {
        time,
        value: i >= 49 ? candles.slice(i - 49, i + 1).reduce((sum, candle) => sum + candle.close, 0) / 50 : c.close,
      };
    });
    indicatorData.set('ma-50', ma50Data);
  }

  // Generate volume data - convert time to Unix timestamp
  const volumeData: VolumeData[] = candles.map((c) => {
    const time = typeof c.time === 'string' 
      ? Math.floor(new Date(c.time).getTime() / 1000)
      : c.time;
    return {
      time,
      value: c.volume,
      color: c.close >= c.open ? '#22c55e' : '#ef4444',
    };
  });

  // Detect indicator signals
  const indicatorSignals = indicators ? detectIndicatorSignals(indicators) : [];

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-green-500" />
            MomentoFX
          </h1>
          <p className="text-gray-400 mt-1">
            Forex Crash Trading with Live Analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-green-400 border-green-500">
            {selectedSource || 'Loading...'}
          </Badge>
          <Badge variant={isGameRunning ? "default" : "secondary"} className="bg-orange-600">
            {isGameRunning ? 'Live' : 'Waiting'}
          </Badge>
        </div>
      </div>

      {/* Source Selector */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-400">Select Source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {pairs.map((pair) => (
              <Button
                key={pair.id}
                variant={selectedSource === pair.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSource(pair.id)}
                className={selectedSource === pair.id ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {pair.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Crash Game */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Live Crash Game
          </CardTitle>
          <CardDescription>
            Real-time crash mechanics with {selectedSource}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Multiplier */}
            <div className="text-center p-6 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Current Multiplier</div>
              <div className={`text-5xl font-bold ${getMultiplierColor(currentMultiplier)}`}>
                {currentMultiplier.toFixed(2)}x
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {isGameRunning ? 'Game in progress' : 'Waiting for next round'}
              </div>
            </div>

            {/* Current Points */}
            <div className="text-center p-6 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Current Points</div>
              <div className="text-3xl font-bold text-blue-400">
                {livePrice ? livePrice.points.toFixed(1) : 'Loading...'}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                {livePrice && getTrendIcon(livePrice.trend)}
                <span className={`text-sm ${livePrice?.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {livePrice ? `${livePrice.change >= 0 ? '+' : ''}${livePrice.change.toFixed(2)}%` : ''}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Band: {livePrice?.band || 'N/A'}
              </div>
            </div>

            {/* Game Controls */}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Bet Amount ($)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                  min="1"
                  max="10000"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Auto Cashout (x)</label>
                <input
                  type="number"
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                  min="1.01"
                  step="0.1"
                />
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={!isGameRunning}
              >
                {isGameRunning ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Place Bet
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Waiting
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gray-900 border-gray-800">
          <TabsTrigger value="live" className="data-[state=active]:bg-green-600">
            <Activity className="w-4 h-4 mr-2" />
            Live Trading
          </TabsTrigger>
          <TabsTrigger value="analysis" className="data-[state=active]:bg-blue-600">
            <BarChart3 className="w-4 h-4 mr-2" />
            Technical Analysis
          </TabsTrigger>
          <TabsTrigger value="patterns" className="data-[state=active]:bg-purple-600">
            <LineChart className="w-4 h-4 mr-2" />
            Pattern Detection
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="data-[state=active]:bg-orange-600">
            <PieChart className="w-4 h-4 mr-2" />
            Portfolio
          </TabsTrigger>
        </TabsList>

        {/* Live Trading Tab */}
        <TabsContent value="live" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Professional Candlestick Chart</CardTitle>
                  <CardDescription>
                    Real-time price movement for {selectedSource}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <TimeframeManager
                    activeTimeframe={activeTimeframe}
                    onTimeframeChange={handleTimeframeChange}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="border-gray-700"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Drawing Tools Panel */}
                <div className="lg:col-span-1">
                  <DrawingManager
                    activeTool={activeTool}
                    onToolSelect={setActiveTool}
                    drawings={drawings}
                    onDrawingAdd={handleDrawingAdd}
                    onDrawingRemove={handleDrawingRemove}
                    onDrawingClear={handleDrawingClear}
                    source={selectedSource || ''}
                    timeframe={activeTimeframe}
                  />
                </div>

                {/* Chart Area */}
                <div className="lg:col-span-3">
                  <ProfessionalCandleChart
                    candles={lightweightCandles as any}
                    volume={showVolume ? volumeData : []}
                    indicators={indicatorData}
                    height={isFullscreen ? 800 : 500}
                    showVolume={showVolume}
                    showIndicators={showIndicators}
                  />
                </div>
              </div>

              {/* Indicator Signals */}
              {indicatorSignals.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {indicatorSignals.map((signal, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className={
                        signal.signal === 'buy'
                          ? 'border-green-500 text-green-400 bg-green-500/10'
                          : signal.signal === 'sell'
                          ? 'border-red-500 text-red-400 bg-red-500/10'
                          : 'border-gray-500 text-gray-400 bg-gray-500/10'
                      }
                    >
                      {signal.type}: {signal.signal} ({(signal.strength * 100).toFixed(0)}%)
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Games */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Recent Crash Games</CardTitle>
              <CardDescription>
                History of recent crash outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {crashGame?.recent_outcomes?.slice(0, 10).map((outcome, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 w-6">#{index + 1}</span>
                      <div className={`font-bold ${getMultiplierColor(outcome.multiplier)}`}>
                        {outcome.multiplier.toFixed(2)}x
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(outcome.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Technical Indicators</CardTitle>
                  <CardDescription>
                    Real-time technical analysis for {selectedSource} ({activeTimeframe})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!indicators ? (
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Loading technical indicators...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="text-sm text-gray-400 mb-2">RSI (14)</div>
                        <div className={`text-xl font-bold ${indicators.rsi > 70 ? 'text-red-400' : indicators.rsi < 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {indicators.rsi.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {indicators.rsi > 70 ? 'Overbought' : indicators.rsi < 30 ? 'Oversold' : 'Neutral'}
                        </div>
                      </div>
                      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="text-sm text-gray-400 mb-2">MACD</div>
                        <div className={`text-xl font-bold ${indicators.macd > indicators.macd_signal ? 'text-green-400' : 'text-red-400'}`}>
                          {indicators.macd.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Signal: {indicators.macd_signal.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="text-sm text-gray-400 mb-2">Stochastic</div>
                        <div className="text-xl font-bold text-blue-400">
                          {indicators.stochastic_k.toFixed(1)} / {indicators.stochastic_d.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          %K / %D
                        </div>
                      </div>
                      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="text-sm text-gray-400 mb-2">ATR (14)</div>
                        <div className="text-xl font-bold text-purple-400">
                          {indicators.atr.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Volatility
                        </div>
                      </div>
                      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="text-sm text-gray-400 mb-2">MA (20)</div>
                        <div className="text-xl font-bold text-orange-400">
                          {indicators.ma_20.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          MA (50): {indicators.ma_50.toFixed(1)}
                        </div>
                      </div>
                      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="text-sm text-gray-400 mb-2">Volume</div>
                        <div className="text-xl font-bold text-green-400">
                          {indicators.volume}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Rounds
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div>
              {indicators && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle>Indicator Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowIndicators(!showIndicators)}
                      className="w-full justify-start"
                    >
                      {showIndicators ? 'Hide' : 'Show'} Indicators
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVolume(!showVolume)}
                      className="w-full justify-start"
                    >
                      {showVolume ? 'Hide' : 'Show'} Volume
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Pattern Detection Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Detected Patterns</CardTitle>
              <CardDescription>
                Chart pattern recognition for {selectedSource} ({activeTimeframe})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!patterns ? (
                <div className="text-center py-8 text-gray-500">
                  <LineChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Scanning for patterns...</p>
                </div>
              ) : patterns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No patterns detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patterns.map((pattern) => (
                    <div
                      key={pattern.id}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${pattern.bullish ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          {pattern.bullish ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{pattern.name}</div>
                          <div className="text-xs text-gray-400">{pattern.description}</div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {pattern.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {pattern.timeframe}
                            </Badge>
                          </div>
                          {pattern.target_price && (
                            <div className="text-xs text-gray-500 mt-1">
                              Target: {pattern.target_price.toFixed(2)}x
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={pattern.bullish ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-red-500/20 text-red-400 border-red-500'}>
                          {(pattern.confidence * 100).toFixed(0)}%
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(pattern.detected_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Portfolio Overview</CardTitle>
              <CardDescription>
                Your positions and P&L
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!portfolio ? (
                <div className="text-center py-8 text-gray-500">
                  <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Loading portfolio...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Portfolio Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Balance</div>
                      <div className="text-xl font-bold text-green-400">
                        ${portfolio.balance.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Total P&L</div>
                      <div className={`text-xl font-bold ${portfolio.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${portfolio.total_pnl >= 0 ? '+' : ''}{portfolio.total_pnl.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Win Rate</div>
                      <div className="text-xl font-bold text-blue-400">
                        {(portfolio.win_rate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Total Trades</div>
                      <div className="text-xl font-bold text-purple-400">
                        {portfolio.total_trades}
                      </div>
                    </div>
                  </div>

                  {/* Active Positions */}
                  <div>
                    <h4 className="font-medium mb-3">Active Positions</h4>
                    {portfolio.positions.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No active positions
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {portfolio.positions.map((position, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{position.source}</Badge>
                              <div>
                                <div className="font-medium">${position.amount.toFixed(2)}</div>
                                <div className="text-xs text-gray-400">
                                  Entry: {multiplier(position.entry_multiplier)}
                                </div>
                              </div>
                            </div>
                            <div className={`font-bold ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

export default MomentoFX;
