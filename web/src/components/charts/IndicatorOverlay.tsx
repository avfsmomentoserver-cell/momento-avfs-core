import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TechnicalIndicator } from "@/lib/invent-middleware/momentoFX";
import { decimal, percent } from "@/lib/format";

interface IndicatorOverlayProps {
  indicators: TechnicalIndicator;
  showRSI?: boolean;
  showMACD?: boolean;
  showBollinger?: boolean;
  showStochastic?: boolean;
  showATR?: boolean;
  onToggleRSI?: () => void;
  onToggleMACD?: () => void;
  onToggleBollinger?: () => void;
  onToggleStochastic?: () => void;
  onToggleATR?: () => void;
}

export function IndicatorOverlay({
  indicators,
  showRSI = true,
  showMACD = true,
  showBollinger = true,
  showStochastic = true,
  showATR = true,
  onToggleRSI,
  onToggleMACD,
  onToggleBollinger,
  onToggleStochastic,
  onToggleATR,
}: IndicatorOverlayProps) {
  const getRSIColor = (rsi: number) => {
    if (rsi >= 70) return "text-critical";
    if (rsi <= 30) return "text-signal";
    return "text-foreground";
  };

  const getMACDColor = (macd: number, signal: number) => {
    if (macd > signal) return "text-signal";
    if (macd < signal) return "text-critical";
    return "text-foreground";
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-300">Technical Indicators</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* RSI */}
        {showRSI && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">RSI (14)</span>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-sm ${getRSIColor(indicators.rsi)}`}>
                {decimal(indicators.rsi, 1)}
              </span>
              {onToggleRSI && (
                <button
                  onClick={onToggleRSI}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Hide
                </button>
              )}
            </div>
          </div>
        )}

        {/* MACD */}
        {showMACD && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">MACD (12,26,9)</span>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-sm ${getMACDColor(indicators.macd, indicators.macd_signal)}`}>
                {decimal(indicators.macd, 2)}
              </span>
              {onToggleMACD && (
                <button
                  onClick={onToggleMACD}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Hide
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bollinger Bands */}
        {showBollinger && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Bollinger (20,2)</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-foreground">
                {decimal(indicators.bollinger_upper, 1)} / {decimal(indicators.bollinger_lower, 1)}
              </span>
              {onToggleBollinger && (
                <button
                  onClick={onToggleBollinger}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Hide
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stochastic */}
        {showStochastic && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Stochastic (14,3,3)</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-foreground">
                %K: {decimal(indicators.stochastic_k, 1)} / %D: {decimal(indicators.stochastic_d, 1)}
              </span>
              {onToggleStochastic && (
                <button
                  onClick={onToggleStochastic}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Hide
                </button>
              )}
            </div>
          </div>
        )}

        {/* ATR */}
        {showATR && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">ATR (14)</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-foreground">
                {decimal(indicators.atr, 1)}
              </span>
              {onToggleATR && (
                <button
                  onClick={onToggleATR}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Hide
                </button>
              )}
            </div>
          </div>
        )}

        {/* Volume */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
          <span className="text-xs text-gray-400">Volume</span>
          <span className="font-mono text-sm text-foreground">
            {indicators.volume} rounds
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
