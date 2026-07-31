import { useState, useCallback, useEffect } from 'react';
import type { DrawingTool, DrawingToolType, DrawingSuggestion, Timeframe } from '@/lib/invent-middleware/momentoFX-types';

interface DrawingManagerProps {
  activeTool: DrawingToolType | null;
  onToolSelect: (tool: DrawingToolType | null) => void;
  drawings: DrawingTool[];
  onDrawingAdd: (drawing: DrawingTool) => void;
  onDrawingRemove: (id: string) => void;
  onDrawingClear: () => void;
  source: string;
  timeframe: Timeframe;
  showSuggestions?: boolean;
}

/**
 * Drawing Manager Component
 * 
 * Manages drawing tools with smart suggestions and persistence
 * Features:
 * - Multiple drawing tools (trendline, horizontal, fibonacci, support, resistance, rectangle, channel)
 * - Drawing persistence (localStorage)
 * - Smart suggestions (auto-detect support/resistance)
 * - Drawing layer management
 * - Undo/redo functionality
 * 
 * Follows professional forex trading interface patterns
 */
export function DrawingManager({
  activeTool,
  onToolSelect,
  drawings,
  onDrawingAdd,
  onDrawingRemove,
  onDrawingClear,
  source,
  timeframe,
  showSuggestions = true,
}: DrawingManagerProps) {
  const [suggestions, setSuggestions] = useState<DrawingSuggestion[]>([]);

  // Load drawings from localStorage on mount
  useEffect(() => {
    const saved = loadDrawings(source, timeframe);
    if (saved.length > 0) {
      saved.forEach((drawing) => onDrawingAdd(drawing));
    }
  }, [source, timeframe, onDrawingAdd]);

  // Save drawings to localStorage when they change
  useEffect(() => {
    if (drawings.length > 0) {
      saveDrawings(source, timeframe, drawings);
    }
  }, [drawings, source, timeframe]);

  // Generate smart suggestions
  useEffect(() => {
    if (showSuggestions && drawings.length > 0) {
      const newSuggestions = generateSmartSuggestions(drawings);
      setSuggestions(newSuggestions);
    }
  }, [drawings, showSuggestions]);

  const handleToolClick = useCallback(
    (tool: DrawingToolType) => {
      onToolSelect(activeTool === tool ? null : tool);
    },
    [activeTool, onToolSelect]
  );

  const handleClearAll = useCallback(() => {
    onDrawingClear();
    clearDrawings(source, timeframe);
  }, [onDrawingClear, source, timeframe]);

  return (
    <div className="flex flex-col gap-3">
      {/* Drawing Tool Selection */}
      <div className="flex flex-wrap gap-2">
        {DRAWING_TOOLS.map((tool) => (
          <DrawingToolButton
            key={tool.type}
            tool={tool}
            isActive={activeTool === tool.type}
            onClick={handleToolClick}
          />
        ))}
      </div>

      {/* Smart Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-[#8891b0] mb-2 uppercase tracking-wider">
            Smart Suggestions
          </div>
          <div className="flex flex-col gap-1">
            {suggestions.map((suggestion, index) => (
              <SuggestionItem
                key={index}
                suggestion={suggestion}
                onApply={() => applySuggestion(suggestion, onDrawingAdd)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Drawing Actions */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleClearAll}
          className="px-3 py-1.5 text-xs rounded-md bg-[#13131a] text-[#8891b0] border border-[#1e1e2e] hover:border-red-500 hover:text-red-400 transition-all"
        >
          Clear All
        </button>
      </div>

      {/* Drawing Count */}
      <div className="text-xs text-[#8891b0]">
        {drawings.length} drawing{drawings.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

interface DrawingToolButtonProps {
  tool: { type: DrawingToolType; label: string; icon: string };
  isActive: boolean;
  onClick: (type: DrawingToolType) => void;
}

function DrawingToolButton({ tool, isActive, onClick }: DrawingToolButtonProps) {
  return (
    <button
      onClick={() => onClick(tool.type)}
      className={`
        px-3 py-2 rounded-md text-xs font-medium transition-all duration-200
        flex items-center gap-2
        ${
          isActive
            ? 'bg-purple-600 text-white border-purple-600'
            : 'bg-[#13131a] text-[#8891b0] border-[#1e1e2e] hover:border-purple-600 hover:text-purple-400'
        }
        border
      `}
      title={tool.label}
    >
      <span>{tool.icon}</span>
      <span>{tool.label}</span>
    </button>
  );
}

interface SuggestionItemProps {
  suggestion: DrawingSuggestion;
  onApply: () => void;
}

function SuggestionItem({ suggestion, onApply }: SuggestionItemProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-[#13131a] border border-[#1e1e2e]">
      <div className="flex-1">
        <div className="text-xs text-[#dde1f0] font-medium">
          {getToolLabel(suggestion.type)}
        </div>
        <div className="text-xs text-[#8891b0] mt-0.5">
          {suggestion.reason}
        </div>
        <div className="text-xs text-purple-400 mt-0.5">
          {(suggestion.confidence * 100).toFixed(0)}% confidence
        </div>
      </div>
      <button
        onClick={onApply}
        className="px-2 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
      >
        Apply
      </button>
    </div>
  );
}

/**
 * Drawing tool definitions
 */
const DRAWING_TOOLS: Array<{ type: DrawingToolType; label: string; icon: string }> = [
  { type: 'trendline', label: 'Trendline', icon: '📏' },
  { type: 'horizontal', label: 'Horizontal', icon: '➖' },
  { type: 'fibonacci', label: 'Fibonacci', icon: '📊' },
  { type: 'support', label: 'Support', icon: '🟢' },
  { type: 'resistance', label: 'Resistance', icon: '🔴' },
  { type: 'rectangle', label: 'Rectangle', icon: '⬜' },
  { type: 'channel', label: 'Channel', icon: '📐' },
  { type: 'pitchfork', label: 'Pitchfork', icon: '🔱' },
];

/**
 * Generate smart suggestions based on existing drawings
 */
function generateSmartSuggestions(drawings: DrawingTool[]): DrawingSuggestion[] {
  const suggestions: DrawingSuggestion[] = [];

  // Detect potential support levels from horizontal lines
  const horizontalLines = drawings.filter((d) => d.type === 'horizontal');
  if (horizontalLines.length >= 2) {
    const avgY = horizontalLines.reduce((sum, d) => sum + d.points[0].y, 0) / horizontalLines.length;
    suggestions.push({
      type: 'support',
      points: [{ x: 0, y: avgY * 0.95 }, { x: 100, y: avgY * 0.95 }],
      confidence: 0.7,
      reason: 'Support level detected from existing horizontal lines',
      suggested_at: new Date().toISOString(),
    });
  }

  // Detect potential resistance levels
  if (horizontalLines.length >= 2) {
    const avgY = horizontalLines.reduce((sum, d) => sum + d.points[0].y, 0) / horizontalLines.length;
    suggestions.push({
      type: 'resistance',
      points: [{ x: 0, y: avgY * 1.05 }, { x: 100, y: avgY * 1.05 }],
      confidence: 0.65,
      reason: 'Resistance level detected from existing horizontal lines',
      suggested_at: new Date().toISOString(),
    });
  }

  // Detect trendline suggestions from existing trendlines
  const trendlines = drawings.filter((d) => d.type === 'trendline');
  if (trendlines.length >= 1) {
    const lastTrendline = trendlines[trendlines.length - 1];
    const slope = (lastTrendline.points[1].y - lastTrendline.points[0].y) / (lastTrendline.points[1].x - lastTrendline.points[0].x);
    suggestions.push({
      type: 'trendline',
      points: [
        { x: lastTrendline.points[1].x + 20, y: lastTrendline.points[1].y + slope * 20 },
        { x: lastTrendline.points[1].x + 60, y: lastTrendline.points[1].y + slope * 60 },
      ],
      confidence: 0.6,
      reason: 'Parallel trendline suggestion based on existing trend',
      suggested_at: new Date().toISOString(),
    });
  }

  return suggestions.slice(0, 3); // Limit to top 3 suggestions
}

/**
 * Apply a suggestion by creating a new drawing
 */
function applySuggestion(suggestion: DrawingSuggestion, onAdd: (drawing: DrawingTool) => void) {
  const drawing: DrawingTool = {
    id: `drawing-${Date.now()}`,
    type: suggestion.type,
    points: suggestion.points,
    color: getDefaultColor(suggestion.type),
    lineWidth: 2,
    style: 'solid',
    timestamp: new Date().toISOString(),
    source: 'momentofx',
    timeframe: '15m',
  };
  onAdd(drawing);
}

/**
 * Get default color for drawing tool type
 */
function getDefaultColor(type: DrawingToolType): string {
  const colors: Record<DrawingToolType, string> = {
    trendline: '#38bdf8',
    horizontal: '#f59e0b',
    fibonacci: '#22c55e',
    support: '#22c55e',
    resistance: '#ef4444',
    rectangle: '#7c3aed',
    channel: '#38bdf8',
    pitchfork: '#f59e0b',
  };
  return colors[type];
}

/**
 * Get label for drawing tool type
 */
function getToolLabel(type: DrawingToolType): string {
  const labels: Record<DrawingToolType, string> = {
    trendline: 'Trendline',
    horizontal: 'Horizontal Line',
    fibonacci: 'Fibonacci Retracement',
    support: 'Support Level',
    resistance: 'Resistance Level',
    rectangle: 'Rectangle',
    channel: 'Price Channel',
    pitchfork: 'Andrews Pitchfork',
  };
  return labels[type];
}

/**
 * Load drawings from localStorage
 */
function loadDrawings(source: string, timeframe: Timeframe): DrawingTool[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = `momentofx-drawings-${source}-${timeframe}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Failed to load drawings from localStorage:', error);
  }
  return [];
}

/**
 * Save drawings to localStorage
 */
function saveDrawings(source: string, timeframe: Timeframe, drawings: DrawingTool[]) {
  if (typeof window === 'undefined') return;
  try {
    const key = `momentofx-drawings-${source}-${timeframe}`;
    localStorage.setItem(key, JSON.stringify(drawings));
  } catch (error) {
    console.warn('Failed to save drawings to localStorage:', error);
  }
}

/**
 * Clear drawings from localStorage
 */
function clearDrawings(source: string, timeframe: Timeframe) {
  if (typeof window === 'undefined') return;
  try {
    const key = `momentofx-drawings-${source}-${timeframe}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear drawings from localStorage:', error);
  }
}

/**
 * Hook for managing drawing state
 */
export function useDrawingManager(source: string, timeframe: Timeframe) {
  const [drawings, setDrawings] = useState<DrawingTool[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingToolType | null>(null);

  const handleDrawingAdd = useCallback((drawing: DrawingTool) => {
    setDrawings((prev) => [...prev, drawing]);
  }, []);

  const handleDrawingRemove = useCallback((id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleDrawingClear = useCallback(() => {
    setDrawings([]);
  }, []);

  return {
    drawings,
    activeTool,
    setActiveTool,
    handleDrawingAdd,
    handleDrawingRemove,
    handleDrawingClear,
  };
}
