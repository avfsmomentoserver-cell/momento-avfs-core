/**
 * KPI Tile Component
 * 
 * Key performance indicator display with trend and context
 * Commercial-grade design for analytics dashboard
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPITileProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral' | 'warning';
  trendValue?: number;
  target?: number;
  targetLabel?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * KPI Tile with trend indicator and target comparison
 */
export function KPITile({
  title,
  value,
  unit,
  trend = 'neutral',
  trendValue,
  target,
  targetLabel,
  description,
  icon,
  className,
  size = 'md',
}: KPITileProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const trendConfig = {
    up: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    down: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
    neutral: { icon: Minus, color: 'text-gray-500', bg: 'bg-gray-500/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  };

  const TrendIcon = trendConfig[trend].icon;

  const targetProgress = target ? ((Number(value) / target) * 100) : null;
  const isTargetMet = targetProgress !== null && targetProgress >= 100;

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-2">
          <div className={cn('font-bold', sizeClasses[size])}>
            {value}
            {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
          </div>
          {trendValue !== undefined && (
            <div className={cn('flex items-center text-xs', trendConfig[trend].color, trendConfig[trend].bg, 'px-2 py-0.5 rounded-full')}>
              <TrendIcon className="mr-1 h-3 w-3" />
              <span>{Math.abs(trendValue).toFixed(1)}%</span>
            </div>
          )}
        </div>
        
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        
        {target && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{targetLabel || 'Target'}</span>
              <span className={cn(isTargetMet ? 'text-green-500' : 'text-muted-foreground')}>
                {targetProgress?.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  isTargetMet ? 'bg-green-500' : 'bg-primary'
                )}
                style={{ width: `${Math.min(targetProgress || 0, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
