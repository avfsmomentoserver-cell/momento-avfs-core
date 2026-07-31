/**
 * Survival Chart Component
 * 
 * ETA forecasting visualization with survival curve
 * Commercial-grade design for survival estimates
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import type { SurvivalEstimate } from '../../types';

interface SurvivalChartProps {
  estimate: SurvivalEstimate;
  className?: string;
}

/**
 * Survival Chart with ETA forecasting visualization
 */
export function SurvivalChart({ estimate, className }: SurvivalChartProps) {
  const chartData = estimate.survival_curve.map(point => ({
    time: point.time,
    probability: (point.survival_probability * 100).toFixed(1),
  }));

  const formatTooltip = (value: any, name: any) => {
    if (name === 'probability') {
      return [`${value}%`, 'Survival Probability'];
    }
    return [value, name];
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">ETA Forecast</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Predicted Crash Point */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Predicted Crash</p>
            <p className="text-2xl font-bold">{estimate.predicted_crash_point.toFixed(2)}x</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ETA</p>
            <p className="text-2xl font-bold">{estimate.eta_seconds.toFixed(0)}s</p>
          </div>
        </div>

        {/* Confidence */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <span className="text-xs font-medium">{(estimate.confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                estimate.confidence > 0.8 ? 'bg-green-500' : estimate.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${estimate.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* Survival Curve */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
              <XAxis
                dataKey="time"
                className="text-xs"
                label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                className="text-xs"
                label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={formatTooltip} />
              <Line
                type="monotone"
                dataKey="probability"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="probability"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Uncertainty */}
        <div className="text-xs text-muted-foreground">
          Uncertainty: ±{(estimate.uncertainty * 100).toFixed(1)}%
        </div>
      </CardContent>
    </Card>
  );
}
