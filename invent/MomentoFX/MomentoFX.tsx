/**
 * MomentoFX - Forex Crash Trading Invention
 * 
 * Introduces crash game mechanics to forex trading with comprehensive analysis tools
 * and live real-time updates for currency pairs.
 * 
 * Features:
 * - Multi-pair crash trading (EUR/USD, GBP/USD, USD/JPY, etc.)
 * - Real-time price feeds with crash mechanics
 * - Technical analysis tools (RSI, MACD, Moving Averages)
 * - Pattern detection (head & shoulders, triangles, flags)
 * - Portfolio and position management
 * - Live P&L tracking
 * - Risk management tools
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
  PieChart
} from 'lucide-react';

import {
  useForexPairs,
  useLivePrices,
  useCrashGame,
  useTechnicalAnalysis,
  usePatternDetection,
  usePortfolio,
  type ForexPair,
  type LivePrice,
  type CrashGame,
  type TechnicalIndicator,
  type Pattern,
  type Position
} from '@/lib/invent-middleware/momentoFX';

const MomentoFX: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [activeTab, setActiveTab] = useState('live');
  const [betAmount, setBetAmount] = useState(100);
  const [autoCashout, setAutoCashout] = useState(2.0);

  // Fetch data through middleware
  const pairsQuery = useForexPairs();
  const pricesQuery = useLivePrices(selectedPair);
  const crashGameQuery = useCrashGame(selectedPair);
  const analysisQuery = useTechnicalAnalysis(selectedPair);
  const patternsQuery = usePatternDetection(selectedPair);
  const portfolioQuery = usePortfolio();

  const pairs = pairsQuery.data || [];
  const livePrice = pricesQuery.data;
  const crashGame = crashGameQuery.data;
  const indicators = analysisQuery.data;
  const patterns = patternsQuery.data;
  const portfolio = portfolioQuery.data;

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
            {selectedPair}
          </Badge>
          <Badge variant={isGameRunning ? "default" : "secondary"} className="bg-orange-600">
            {isGameRunning ? 'Live' : 'Waiting'}
          </Badge>
        </div>
      </div>

      {/* Currency Pair Selector */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-400">Select Currency Pair</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {pairs.map((pair) => (
              <Button
                key={pair.symbol}
                variant={selectedPair === pair.symbol ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPair(pair.symbol)}
                className={selectedPair === pair.symbol ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {pair.symbol}
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
            Real-time forex crash mechanics with {selectedPair}
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

            {/* Current Price */}
            <div className="text-center p-6 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Current Price</div>
              <div className="text-3xl font-bold text-blue-400">
                {livePrice ? livePrice.price.toFixed(5) : 'Loading...'}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                {livePrice && getTrendIcon(livePrice.trend)}
                <span className={`text-sm ${livePrice?.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {livePrice ? `${livePrice.change >= 0 ? '+' : ''}${livePrice.change.toFixed(2)}%` : ''}
                </span>
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
              <CardTitle>Price Chart</CardTitle>
              <CardDescription>
                Real-time price movement for {selectedPair}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center">
                <div className="text-center">
                  <LineChart className="w-12 h-12 mx-auto mb-2 text-blue-400" />
                  <p className="text-gray-400">Live Price Chart</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Real-time visualization
                  </p>
                </div>
              </div>
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
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Technical Indicators</CardTitle>
              <CardDescription>
                Real-time technical analysis for {selectedPair}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!indicators ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Loading technical indicators...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">RSI (14)</div>
                    <div className={`text-xl font-bold ${indicators.rsi > 70 ? 'text-red-400' : indicators.rsi < 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {indicators.rsi.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {indicators.rsi > 70 ? 'Overbought' : indicators.rsi < 30 ? 'Oversold' : 'Neutral'}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">MACD</div>
                    <div className="text-xl font-bold text-blue-400">
                      {indicators.macd.toFixed(4)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Signal: {indicators.macd_signal.toFixed(4)}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">MA (20)</div>
                    <div className="text-xl font-bold text-purple-400">
                      {indicators.ma_20.toFixed(5)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      MA (50): {indicators.ma_50.toFixed(5)}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">Volatility</div>
                    <div className="text-xl font-bold text-orange-400">
                      {indicators.volatility.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ATR: {indicators.atr.toFixed(5)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pattern Detection Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Detected Patterns</CardTitle>
              <CardDescription>
                Chart pattern recognition for {selectedPair}
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
                  {patterns.map((pattern, index) => (
                    <div
                      key={index}
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
                        </div>
                      </div>
                      <Badge className={pattern.bullish ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-red-500/20 text-red-400 border-red-500'}>
                        {(pattern.confidence * 100).toFixed(0)}%
                      </Badge>
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
                              <Badge variant="outline">{position.pair}</Badge>
                              <div>
                                <div className="font-medium">${position.amount.toFixed(2)}</div>
                                <div className="text-xs text-gray-400">
                                  Entry: {position.entry_price.toFixed(5)}
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
