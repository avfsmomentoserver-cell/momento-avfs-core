import { Button } from "@/components/ui/button";
import type { Timeframe } from "@/lib/invent-middleware/momentoFX";

interface TimeframeSelectorProps {
  selectedTimeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D'];

export function TimeframeSelector({ selectedTimeframe, onTimeframeChange }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {timeframes.map((tf) => (
        <Button
          key={tf}
          variant={selectedTimeframe === tf ? "default" : "outline"}
          size="sm"
          onClick={() => onTimeframeChange(tf)}
          className={selectedTimeframe === tf ? "bg-blue-600 hover:bg-blue-700" : ""}
        >
          {tf}
        </Button>
      ))}
    </div>
  );
}
