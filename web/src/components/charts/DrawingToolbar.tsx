import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Minus, 
  Ruler, 
  Square, 
  Trash2,
  MousePointer2
} from "lucide-react";
import type { DrawingTool } from "@/lib/invent-middleware/momentoFX";

interface DrawingToolbarProps {
  activeTool: DrawingTool['type'] | null;
  onToolSelect: (tool: DrawingTool['type'] | null) => void;
  drawings: DrawingTool[];
  onClearAll: () => void;
  onRemoveDrawing: (id: string) => void;
}

export function DrawingToolbar({ 
  activeTool, 
  onToolSelect, 
  drawings, 
  onClearAll,
  onRemoveDrawing
}: DrawingToolbarProps) {
  const tools: Array<{ type: DrawingTool['type']; icon: React.ReactNode; label: string }> = [
    { type: 'trendline', icon: <TrendingUp className="w-4 h-4" />, label: 'Trendline' },
    { type: 'horizontal', icon: <Minus className="w-4 h-4" />, label: 'Horizontal' },
    { type: 'fibonacci', icon: <Ruler className="w-4 h-4" />, label: 'Fibonacci' },
    { type: 'support', icon: <Square className="w-4 h-4" />, label: 'Support Zone' },
    { type: 'rectangle', icon: <Square className="w-4 h-4" />, label: 'Rectangle' },
  ];

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-900 border border-gray-800 rounded-lg">
      {/* Tool Selection */}
      <div className="flex items-center gap-1">
        <Button
          variant={activeTool === null ? "default" : "outline"}
          size="sm"
          onClick={() => onToolSelect(null)}
          className={activeTool === null ? "bg-green-600 hover:bg-green-700" : ""}
        >
          <MousePointer2 className="w-4 h-4" />
        </Button>
        {tools.map((tool) => (
          <Button
            key={tool.type}
            variant={activeTool === tool.type ? "default" : "outline"}
            size="sm"
            onClick={() => onToolSelect(tool.type)}
            className={activeTool === tool.type ? "bg-blue-600 hover:bg-blue-700" : ""}
            title={tool.label}
          >
            {tool.icon}
          </Button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-700" />

      {/* Drawing Actions */}
      <div className="flex items-center gap-1">
        {drawings.length > 0 && (
          <>
            <span className="text-xs text-gray-400">{drawings.length} drawings</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
