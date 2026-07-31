/**
 * Pressure Gauge Component
 * 
 * Multi-variate pressure visualization with gauge display
 * Commercial-grade design for pressure metrics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { COLORS, THRESHOLDS } from '../../constants';

interface PressureGaugeProps {
  pressure: number;
  components?: {
    energy_buildup: number;
    band_momentum: number;
    time_decay: number;
    shape_consistency: number;
    volatility: number;
  };
  signal?: 'buy' | 'sell' | 'hold' | 'neutral';
  strength?: 'weak' | 'moderate' | 'strong';
  showComponents?: boolean;
  className?: string;
}

/**
 * Pressure Gauge with overall score and component breakdown
 */
export function PressureGauge({
  pressure,
  components,
  signal,
  strength,
  showComponents = true,
  className,
}: PressureGaugeProps) {
  const getPressureColor = () => {
    if (pressure >= THRESHOLDS.PRESSURE_HIGH) return COLORS.pressure_high;
    if (pressure >= THRESHOLDS.PRESSURE_MEDIUM) return COLORS.pressure_medium;
    return COLORS.pressure_low;
  };

  const getSignalColor = () => {
    switch (signal) {
      case 'buy': return COLORS.bullish;
      case 'sell': return COLORS.bearish;
      default: return COLORS.neutral;
    }
  };

  const getStrengthColor = () => {
    switch (strength) {
      case 'strong': return COLORS.pressure_high;
      case 'moderate': return COLORS.pressure_medium;
      default: return COLORS.pressure_low;
    }
  };

  const pressureColor = getPressureColor();
  const signalColor = signal ? getSignalColor() : undefined;
  const strengthColor = strength ? getStrengthColor() : undefined;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Pressure Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Pressure */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold" style={{ color: pressureColor }}>
              {(pressure * 100).toFixed(0)}%
            </span>
            {signal && (
              <span
                className="text-xs font-medium px-2 py-1 rounded-full"
                style={{ backgroundColor: `${signalColor}20`, color: signalColor }}
              >
                {signal.toUpperCase()}
              </span>
            )}
          </div>
          <Progress value={pressure * 100} className="h-2" />
          {strength && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Strength</span>
              <span style={{ color: strengthColor }} className="font-medium">
                {strength.charAt(0).toUpperCase() + strength.slice(1)}
              </span>
            </div>
          )}
        </div>

        {/* Component Breakdown */}
        {showComponents && components && (
          <div className="space-y-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground">Components</p>
            
            <div className="space-y-2">
              <PressureComponent
                label="Energy Buildup"
                value={components.energy_buildup}
                color={COLORS.pressure_high}
              />
              <PressureComponent
                label="Band Momentum"
                value={components.band_momentum}
                color={COLORS.pressure_medium}
              />
              <PressureComponent
                label="Time Decay"
                value={components.time_decay}
                color={COLORS.pressure_low}
              />
              <PressureComponent
                label="Shape Consistency"
                value={components.shape_consistency}
                color={COLORS.bullish}
              />
              <PressureComponent
                label="Volatility"
                value={components.volatility}
                color={COLORS.bearish}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PressureComponentProps {
  label: string;
  value: number;
  color: string;
}

function PressureComponent({ label, value, color }: PressureComponentProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium" style={{ color }}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <Progress value={value * 100} className="h-1" />
    </div>
  );
}
