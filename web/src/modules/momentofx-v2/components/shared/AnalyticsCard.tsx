/**
 * Analytics Card Component
 * 
 * Metric display with sparklines and trend indicators
 * Commercial-grade design for analytics dashboard
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  sparkline?: number[];
  color?: 'default' | 'bullish' | 'bearish' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

/**
 * Analytics Card with trend indicator and optional sparkline
 */
export function AnalyticsCard({
  title,
  value,
  change,
  changeLabel,
  sparkline,
  color = 'default',
  icon,
  subtitle,
  className,
}: AnalyticsCardProps) {
  const colorClasses = {
    default: 'text-foreground',
    bullish: 'text-green-500',
    bearish: 'text-red-500',
    neutral: 'text-gray-500',
  };

  const trendIcon = change === undefined ? null : change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
  const trendColor = change === undefined ? 'text-gray-500' : change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-500';

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-2">
          <div className={cn('text-2xl font-bold', colorClasses[color])}>{value}</div>
          {change !== undefined && (
            <div className={cn('flex items-center text-xs', trendColor)}>
              {trendIcon && <trendIcon className="mr-1 h-3 w-3" />}
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {changeLabel && (
          <Badge variant="outline" className="mt-2 text-xs">
            {changeLabel}
          </Badge>
        )}
        {sparkline && sparkline.length > 0 && (
          <div className="mt-3 h-8 flex items-end space-x-0.5">
            {sparkline.map((value, index) => {
              const max = Math.max(...sparkline);
              const min = Math.min(...sparkline);
              const range = max - min || 1;
              const height = ((value - min) / range) * 100;
              
              return (
                <div
                  key={index}
                  className={cn(
                    'flex-1 rounded-sm transition-all',
                    color === 'bullish' ? 'bg-green-500/20' : color === 'bearish' ? 'bg-red-500/20' : 'bg-primary/20'
                  )}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
