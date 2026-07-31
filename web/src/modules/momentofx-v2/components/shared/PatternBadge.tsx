/**
 * Pattern Badge Component
 * 
 * AI/ML pattern confidence display with visual indicators
 * Commercial-grade design for pattern recognition results
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THRESHOLDS } from '../../constants';

interface PatternBadgeProps {
  patternName: string;
  confidence: number;
  probability?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Pattern Badge with confidence level and visual indicator
 */
export function PatternBadge({
  patternName,
  confidence,
  probability,
  showIcon = true,
  size = 'md',
  className,
}: PatternBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const getConfidenceLevel = () => {
    if (confidence >= THRESHOLDS.CONFIDENCE_HIGH) return 'high';
    if (confidence >= THRESHOLDS.CONFIDENCE_MEDIUM) return 'medium';
    return 'low';
  };

  const confidenceLevel = getConfidenceLevel();

  const confidenceConfig = {
    high: {
      color: 'bg-green-500/10 text-green-500 border-green-500/20',
      icon: CheckCircle,
      label: 'High Confidence',
    },
    medium: {
      color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      icon: AlertCircle,
      label: 'Medium Confidence',
    },
    low: {
      color: 'bg-red-500/10 text-red-500 border-red-500/20',
      icon: XCircle,
      label: 'Low Confidence',
    },
  };

  const config = confidenceConfig[confidenceLevel];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'font-medium border',
              config.color,
              sizeClasses[size],
              className
            )}
          >
            {showIcon && <Icon className={cn('mr-1', iconSize[size])} />}
            <span>{patternName}</span>
            <span className="ml-1 opacity-75">
              {Math.round(confidence * 100)}%
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">
              Confidence: {(confidence * 100).toFixed(1)}%
            </p>
            {probability !== undefined && (
              <p className="text-xs text-muted-foreground">
                Probability: {(probability * 100).toFixed(1)}%
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
