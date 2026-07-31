/**
 * MomentoFX v2.0 Dashboard
 * 
 * Main dashboard component for commercial-grade analytics platform
 * Provides real-time metrics, charts, and AI/ML insights
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, Maximize2, LayoutGrid, BarChart3, Brain, TrendingUp } from 'lucide-react';

// Import v2.0 components
import { AnalyticsCard } from '../shared/AnalyticsCard';
import { KPITile } from '../shared/KPITile';
import { PatternBadge } from '../shared/PatternBadge';
import { PressureGauge } from '../shared/PressureGauge';
import { SurvivalChart } from '../shared/SurvivalChart';

// Import custom hooks
import { useAnalytics, usePressureScore } from '../../hooks/useAnalytics';
import { usePatterns, useSurvivalEstimate } from '../../hooks/useML';

// Import services
import { notificationService } from '../../services/NotificationService';

// Import types
import type { AnalyticsMetrics, PatternPrediction, SurvivalEstimate, PressureScore } from '../../types';
import type { Timeframe } from '../../types';
import { DEFAULT_TIMEFRAME, AVAILABLE_TIMEFRAMES } from '../../constants';

/**
 * MomentoFX v2.0 Main Dashboard
 */
export function MomentoFXDashboard() {
  const [source, setSource] = useState('default');
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [notifications, setNotifications] = useState(0);

  // Use custom hooks for data fetching
  const { data: metrics, isLoading: metricsLoading } = useAnalytics(source, timeframe);
  const { data: pressure } = usePressureScore(source);
  const { data: patterns } = usePatterns(source, timeframe);
  const { data: survival } = useSurvivalEstimate(source);

  // Subscribe to notifications
  React.useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      setNotifications(notificationService.getUnreadNotifications().length);
    });
    return unsubscribe;
  }, []);

  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MomentoFX v2.0</h1>
          <p className="text-muted-foreground mt-1">Commercial-Grade Crash Game Analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {notifications}
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex items-center gap-2">
        {AVAILABLE_TIMEFRAMES.map((tf) => (
          <Button
            key={tf}
            variant={timeframe === tf ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTimeframeChange(tf)}
          >
            {tf}
          </Button>
        ))}
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          title="Current Pressure"
          value={metrics?.current_pressure.toFixed(2) || '0.00'}
          trend={pressure?.trend === 'increasing' ? 'up' : pressure?.trend === 'decreasing' ? 'down' : 'neutral'}
          trendValue={metrics?.current_pressure ? (metrics.current_pressure * 100) : undefined}
          target={1.0}
          targetLabel="Max Pressure"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPITile
          title="Pattern Accuracy"
          value={metrics?.accuracy_score.toFixed(1) || '0.0'}
          unit="%"
          trend="up"
          trendValue={5.2}
          target={85}
          targetLabel="Target Accuracy"
          icon={<Brain className="h-4 w-4" />}
        />
        <KPITile
          title="Active Patterns"
          value={patterns?.length || 0}
          trend={patterns && patterns.length > 0 ? 'up' : 'neutral'}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <KPITile
          title="Volatility"
          value={metrics?.volatility.toFixed(2) || '0.00'}
          trend={metrics?.volatility ? (metrics.volatility > 1 ? 'warning' : 'neutral') : 'neutral'}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="backtesting">Backtesting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Pressure Gauge */}
            <div className="lg:col-span-1">
              {pressure && (
                <PressureGauge
                  pressure={pressure.overall}
                  components={pressure.components}
                  signal={pressure.signal}
                  strength={pressure.strength}
                />
              )}
            </div>

            {/* Survival Chart */}
            <div className="lg:col-span-1">
              {survival && <SurvivalChart estimate={survival} />}
            </div>

            {/* Recent Patterns */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Recent Patterns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!patterns || patterns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No patterns detected</p>
                  ) : (
                    patterns.slice(0, 5).map((pattern) => (
                      <div key={pattern.id} className="flex items-center justify-between">
                        <PatternBadge
                          patternName={pattern.pattern_type}
                          confidence={pattern.confidence}
                          probability={pattern.probability}
                          size="sm"
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnalyticsCard
              title="Energy Buildup"
              value={metrics?.energy_buildup.toFixed(2) || '0.00'}
              change={metrics?.energy_buildup ? (metrics.energy_buildup * 100 - 50) : undefined}
              changeLabel="vs baseline"
              color={metrics?.energy_buildup ? (metrics.energy_buildup > 0.5 ? 'bullish' : 'bearish') : 'default'}
              sparkline={Array.from({ length: 20 }, () => Math.random())}
            />
            <AnalyticsCard
              title="Band Momentum"
              value={metrics?.band_momentum.toFixed(2) || '0.00'}
              change={metrics?.band_momentum ? (metrics.band_momentum * 100 - 50) : undefined}
              changeLabel="vs baseline"
              color={metrics?.band_momentum ? (metrics.band_momentum > 0.5 ? 'bullish' : 'bearish') : 'default'}
              sparkline={Array.from({ length: 20 }, () => Math.random())}
            />
            <AnalyticsCard
              title="Shape Consistency"
              value={metrics?.shape_consistency.toFixed(2) || '0.00'}
              change={metrics?.shape_consistency ? (metrics.shape_consistency * 100 - 50) : undefined}
              changeLabel="vs baseline"
              color={metrics?.shape_consistency ? (metrics.shape_consistency > 0.5 ? 'bullish' : 'bearish') : 'default'}
              sparkline={Array.from({ length: 20 }, () => Math.random())}
            />
          </div>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Pattern Detection</CardTitle>
            </CardHeader>
            <CardContent>
              {patterns.length === 0 ? (
                <p className="text-muted-foreground">No patterns detected</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patterns.map((pattern) => (
                    <Card key={pattern.id}>
                      <CardHeader>
                        <CardTitle className="text-sm">
                          <PatternBadge
                            patternName={pattern.pattern_type}
                            confidence={pattern.confidence}
                            probability={pattern.probability}
                          />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-xs text-muted-foreground">{pattern.explanation}</p>
                        {pattern.target_price && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Target</span>
                            <span className="font-medium">{pattern.target_price.toFixed(2)}x</span>
                          </div>
                        )}
                        {pattern.stop_loss && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Stop Loss</span>
                            <span className="font-medium">{pattern.stop_loss.toFixed(2)}x</span>
                          </div>
                        )}
                        {pattern.risk_reward_ratio && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">R:R Ratio</span>
                            <span className="font-medium">{pattern.risk_reward_ratio.toFixed(2)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Advanced analytics features coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backtesting">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Backtesting</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Backtesting features coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
