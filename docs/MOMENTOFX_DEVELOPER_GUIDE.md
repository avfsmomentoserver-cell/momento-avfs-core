# MomentoFX - Developer Guide

## Overview

MomentoFX is a forex-style crash trading invention that applies professional forex trading concepts to crash game mechanics. It leverages the Momento Core platform's infrastructure to provide advanced candlestick charting, technical analysis, pattern detection, and drawing tools for crash game data.

## Value Proposition for Forex Traders

MomentoFX bridges the gap between traditional forex trading and crash games by:

1. **Professional Charting**: OHLC candlestick charts with multiple timeframes
2. **Technical Analysis**: RSI, MACD, Bollinger Bands, Stochastic, ATR indicators
3. **Drawing Tools**: Trendlines, horizontal lines, Fibonacci retracements, support zones
4. **Pattern Detection**: Algorithmic recognition of double tops/bottoms, triangles, flags
5. **Real-Time Data**: Live updates using the platform's robust data infrastructure
6. **Portfolio Management**: Position tracking and P&L calculation

## Platform Integration

### Data Flow Architecture

```
Momento Core API → dataIngester → momentoFX Middleware → UI Components
```

### Leveraged Platform Features

#### 1. Data Ingestion System
MomentoFX uses the platform's robust data ingestion infrastructure:

- **Sources API**: `/api/v1/sources` - Retrieves configured crash game sources
- **Rounds API**: `/api/v1/rounds` - Fetches historical round data
- **Latest Rounds API**: `/api/v1/rounds/latest` - Gets recent rounds for live updates
- **Linguistics API**: `/api/v1/linguistics` - Provides multiplier-to-points conversion

**Why this matters**: Forex traders get reliable, validated data without worrying about data quality issues.

#### 2. Linguistics System
MomentoFX leverages the platform's eight-layer semantic vocabulary:

- **Multiplier Normalization**: Converts raw multipliers to semantic points
- **Band Classification**: Categorizes multipliers into meaningful bands
- **Pattern Recognition**: Uses linguistic tokens for enhanced pattern detection

**Why this matters**: Forex traders get familiar semantic categories (e.g., "mini moonshot", "crash") that map to their forex terminology.

#### 3. Candle Aggregation API
MomentoFX uses the platform's candle endpoint:

- **Candles API**: `/api/v1/candles` - Provides OHLC data with configurable aggregation
- **Timeframe Support**: 1m, 5m, 15m, 1h, 4h, 1D timeframes
- **Volume Data**: Round count per candle for activity analysis

**Why this matters**: Forex traders get professional OHLC data similar to forex platforms.

#### 4. Analysis Engine
MomentoFX extends the platform's analysis capabilities:

- **Technical Indicators**: RSI, MACD, Bollinger Bands, Stochastic, ATR
- **Pattern Detection**: Double top/bottom, triangles, flags
- **Confidence Scoring**: Statistical confidence for all predictions

**Why this matters**: Forex traders get the same technical analysis tools they use in forex.

## Technical Architecture

### Middleware Layer

#### File: `web/src/lib/invent-middleware/momentoFX.ts`

The middleware layer is the core of MomentoFX, following the platform's strict middleware pattern:

**Key Components**:

1. **Data Fetching**
   - `getForexPairs()`: Fetches available sources from platform
   - `getLivePrice()`: Gets current multiplier with linguistics conversion
   - `getCandles()`: Retrieves OHLC data with timeframe aggregation
   - `getTechnicalAnalysis()`: Calculates technical indicators
   - `getPatternDetection()`: Detects chart patterns

2. **Technical Analysis**
   - RSI calculation (14-period)
   - MACD calculation (12, 26, 9)
   - Bollinger Bands (20, 2)
   - Stochastic (14, 3, 3)
   - ATR (14-period)
   - Moving Averages (20, 50)

3. **Pattern Detection**
   - Double Top/Bottom detection
   - Triangle pattern recognition
   - Flag pattern identification
   - Confidence scoring

4. **React Query Hooks**
   - `useForexPairs()`: Source data with 5s refresh
   - `useLivePrices()`: Live price data with 1s refresh
   - `useCandles()`: Candle data with 5s refresh
   - `useTechnicalAnalysis()`: Indicators with 5s refresh
   - `usePatternDetection()`: Patterns with 10s refresh
   - `usePortfolio()`: Portfolio data with 5s refresh

### UI Components

#### File: `web/src/components/charts/ForexCandleChart.tsx`

Professional candlestick chart component using Recharts:

**Features**:
- OHLC candle visualization
- Bullish/bearish color coding
- Interactive tooltips
- Drawing tools overlay
- Bollinger Bands overlay
- Responsive design

**Drawing Tools Support**:
- Trendlines
- Horizontal lines
- Fibonacci retracements
- Support/resistance zones
- Rectangles

#### File: `web/src/components/charts/DrawingToolbar.tsx`

Drawing tool selection and management interface:

**Tools**:
- Trendline tool
- Horizontal line tool
- Fibonacci retracement tool
- Support zone tool
- Rectangle tool

**Management**:
- Tool selection
- Drawing count display
- Clear all drawings
- Individual drawing removal

#### File: `web/src/components/charts/TimeframeSelector.tsx`

Timeframe switching component:

**Timeframes**:
- 1m (1 round per candle)
- 5m (5 rounds per candle)
- 15m (15 rounds per candle)
- 1h (60 rounds per candle)
- 4h (240 rounds per candle)
- 1D (1440 rounds per candle)

#### File: `web/src/components/charts/IndicatorOverlay.tsx`

Technical indicator display panel:

**Indicators**:
- RSI with overbought/oversold status
- MACD with signal line
- Bollinger Bands with toggle
- Stochastic %K/%D
- ATR volatility
- Volume

**Controls**:
- Toggle individual indicators
- Show/hide Bollinger Bands on chart

### Main UI Page

#### File: `web/src/pages/dashboard/MomentoFX.tsx`

Main UI page integrating all components:

**Tabs**:
1. **Live Trading**: Candlestick chart with drawing tools
2. **Technical Analysis**: Enhanced indicators panel
3. **Pattern Detection**: Algorithmic pattern recognition
4. **Portfolio**: Position management and P&L

**Features**:
- Source selection (uses platform sources)
- Timeframe switching
- Drawing tool integration
- Real-time updates
- Responsive layout

## API Integration

### Platform API Endpoints Used

#### Sources
```typescript
GET /api/v1/sources
Response: {
  sources: [
    {
      id: string;
      name: string;
      active: boolean;
      round_count: number;
      latest_multiplier: number | null;
    }
  ]
}
```

#### Latest Rounds
```typescript
GET /api/v1/rounds/latest?source={source}&limit={limit}
Response: {
  rounds: RoundRecord[]
}
```

#### Linguistics
```typescript
GET /api/v1/linguistics?source={source}
Response: {
  tokens: LinguisticsToken[]
}
```

#### Candles
```typescript
GET /api/v1/candles?source={source}&limit={limit}&rounds_per_candle={rpc}
Response: {
  candles: Candle[]
}
```

### Data Transformation

#### Multiplier to Points Conversion
```typescript
// Uses platform linguistics system
const linguistics = await api.linguistics(source);
const token = linguistics.tokens.find(t => 
  t.multiplier === round.multiplier
);
const points = token ? token.points : round.multiplier;
```

#### OHLC Aggregation
```typescript
// Platform provides pre-aggregated candles
const candles = await api.candles(source, limit, roundsPerCandle);
// Returns: open, high, low, close, peak_multiplier, volume, time
```

## Technical Indicator Calculations

### RSI (Relative Strength Index)
```typescript
function calculateRSI(candles: Candle[], period: number = 14): number {
  // Calculate average gains and losses
  // Compute RSI: 100 - (100 / (1 + RS))
  // RS = Average Gain / Average Loss
}
```

### MACD (Moving Average Convergence Divergence)
```typescript
function calculateMACD(candles: Candle[]): {
  macd: number;
  macd_signal: number;
  macd_histogram: number;
} {
  // Calculate 12-period EMA
  // Calculate 26-period EMA
  // MACD = 12 EMA - 26 EMA
  // Signal = 9-period EMA of MACD
  // Histogram = MACD - Signal
}
```

### Bollinger Bands
```typescript
function calculateBollingerBands(candles: Candle[], period: number = 20, stdDev: number = 2): {
  upper: number;
  middle: number;
  lower: number;
} {
  // Middle = 20-period SMA
  // Upper = Middle + (2 × Standard Deviation)
  // Lower = Middle - (2 × Standard Deviation)
}
```

### Stochastic Oscillator
```typescript
function calculateStochastic(candles: Candle[], kPeriod: number = 14, dPeriod: number = 3): {
  stochastic_k: number;
  stochastic_d: number;
} {
  // %K = ((Close - Low14) / (High14 - Low14)) × 100
  // %D = 3-period SMA of %K
}
```

### ATR (Average True Range)
```typescript
function calculateATR(candles: Candle[], period: number = 14): number {
  // True Range = max(High - Low, |High - PrevClose|, |Low - PrevClose|)
  // ATR = 14-period average of True Range
}
```

## Pattern Detection Algorithms

### Double Top/Bottom
```typescript
function detectDoubleTop(candles: Candle[]): Pattern | null {
  // Find two peaks with similar heights
  // Check for valley between peaks
  // Calculate confidence based on symmetry
}
```

### Triangle Patterns
```typescript
function detectTriangle(candles: Candle[]): Pattern | null {
  // Ascending: Higher lows, flat highs
  // Descending: Lower highs, flat lows
  // Symmetrical: Converging highs and lows
}
```

### Flag Patterns
```typescript
function detectFlag(candles: Candle[]): Pattern | null {
  // Bull flag: Uptrend followed by consolidation
  // Bear flag: Downtrend followed by consolidation
  // Check for parallel channel
}
```

## Forex Skill Application

### Chart Analysis
Forex traders can apply their chart reading skills:

1. **Support/Resistance**: Use drawing tools to mark key levels
2. **Trend Analysis**: Identify trends using candlestick patterns
3. **Breakout Trading**: Detect breakouts from consolidation
4. **Reversal Patterns**: Use pattern detection for reversal signals

### Technical Indicators
Standard forex indicators are available:

1. **RSI**: Identify overbought/oversold conditions
2. **MACD**: Trend following and momentum
3. **Bollinger Bands**: Volatility and mean reversion
4. **Stochastic**: Momentum oscillator
5. **ATR**: Volatility measurement for position sizing

### Timeframe Analysis
Multiple timeframes for comprehensive analysis:

1. **1m**: Scalping and entry timing
2. **5m**: Short-term trading
3. **15m**: Swing trading
4. **1h**: Medium-term trends
5. **4h**: Trend confirmation
6. **1D**: Long-term analysis

### Risk Management
Apply forex risk management principles:

1. **Position Sizing**: Use ATR for volatility-based sizing
2. **Stop Losses**: Set using support/resistance levels
3. **Take Profits**: Use resistance levels and pattern targets
4. **Risk/Reward**: Calculate using measured moves and patterns

## Development Guide

### Adding New Drawing Tools

1. **Update DrawingTool Type**:
```typescript
interface DrawingTool {
  type: 'trendline' | 'horizontal' | 'fibonacci' | 'support' | 'rectangle' | 'new_tool';
  // ...
}
```

2. **Add Rendering Logic**:
```typescript
// In ForexCandleChart.tsx
case 'new_tool':
  return <YourToolComponent />;
```

3. **Add Toolbar Button**:
```typescript
// In DrawingToolbar.tsx
{ type: 'new_tool', icon: <Icon />, label: 'New Tool' }
```

### Adding New Technical Indicators

1. **Add Calculation Function**:
```typescript
function calculateNewIndicator(candles: Candle[]): number {
  // Your calculation logic
}
```

2. **Update TechnicalIndicator Interface**:
```typescript
interface TechnicalIndicator {
  // existing fields
  new_indicator: number;
}
```

3. **Add to Analysis Method**:
```typescript
async getTechnicalAnalysis(source: string, timeframe: Timeframe) {
  // existing calculations
  const new_indicator = this.calculateNewIndicator(candles);
  return { /* existing */, new_indicator };
}
```

4. **Add to UI**:
```typescript
// In IndicatorOverlay.tsx
<div className="text-sm text-gray-400 mb-2">New Indicator</div>
<div className="text-xl font-bold">{indicators.new_indicator.toFixed(2)}</div>
```

### Adding New Timeframes

1. **Update Timeframe Type**:
```typescript
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | 'new_tf';
```

2. **Add Aggregation Logic**:
```typescript
getRoundsPerCandle(timeframe: Timeframe): number {
  const mapping = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '1h': 60,
    '4h': 240,
    '1D': 1440,
    'new_tf': YOUR_VALUE,
  };
  return mapping[timeframe];
}
```

3. **Add to Selector**:
```typescript
// In TimeframeSelector.tsx
const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D', 'new_tf'];
```

## Testing

### Unit Tests
Test middleware functions:
```typescript
describe('MomentoFX Middleware', () => {
  it('should calculate RSI correctly', () => {
    const rsi = calculateRSI(testCandles);
    expect(rsi).toBeCloseTo(expectedRSI);
  });
});
```

### Integration Tests
Test API integration:
```typescript
describe('API Integration', () => {
  it('should fetch candles from platform', async () => {
    const candles = await api.candles('test_source', 100, 5);
    expect(candles.length).toBeGreaterThan(0);
  });
});
```

### UI Tests
Test component rendering:
```typescript
describe('ForexCandleChart', () => {
  it('should render candles', () => {
    render(<ForexCandleChart candles={testCandles} />);
    // Check for candle elements
  });
});
```

## Performance Optimization

### React Query Caching
```typescript
// Configure stale times for optimal performance
useCandles(source, timeframe, 200, {
  staleTime: 5000, // 5 seconds
  refetchInterval: 5000,
});
```

### Memoization
```typescript
// Memoize expensive calculations
const indicators = useMemo(() => 
  calculateTechnicalAnalysis(candles),
  [candles]
);
```

### Virtualization
For large datasets, consider virtualized scrolling:
```typescript
import { FixedSizeList } from 'react-window';
```

## Deployment

### Build Process
```bash
# Build frontend
cd web
bun run build

# Output in web/dist/
```

### Environment Variables
```bash
# Backend
MOMENTO_API_PORT=8000
MOMENTO_DATABASE_PATH=backend/data/momento.db

# Frontend
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

### Production Considerations
- Enable API authentication
- Configure rate limiting
- Set up monitoring
- Configure logging
- Enable HTTPS

## Future Enhancements

### Planned Features
1. **Drawing Tool Persistence**: Save drawings to localStorage or database
2. **WebSocket Integration**: True real-time updates
3. **Machine Learning**: Enhanced pattern recognition
4. **Advanced Order Types**: Limit orders, stop-loss
5. **Social Trading**: Share analysis and strategies
6. **Mobile Responsiveness**: Mobile-optimized interface
7. **Historical Backtesting**: Strategy testing on historical data
8. **Risk Management Tools**: Advanced position sizing and risk calculators

### Extension Points
- Custom indicator plugins
- Custom drawing tools
- Custom pattern detection algorithms
- Custom timeframes
- Custom data sources

## Support and Resources

### Documentation
- Platform Overview: `/docs/PLATFORM_OVERVIEW.md`
- MomentoFX README: `/invent/MomentoFX/README.md`
- API Documentation: Available via Swagger UI at `/docs`

### Code Locations
- Middleware: `/web/src/lib/invent-middleware/momentoFX.ts`
- Chart Component: `/web/src/components/charts/ForexCandleChart.tsx`
- Drawing Toolbar: `/web/src/components/charts/DrawingToolbar.tsx`
- Timeframe Selector: `/web/src/components/charts/TimeframeSelector.tsx`
- Indicator Overlay: `/web/src/components/charts/IndicatorOverlay.tsx`
- Main UI: `/web/src/pages/dashboard/MomentoFX.tsx`

### Platform Integration
- API Client: `/web/src/lib/api.ts`
- Data Ingester: `/web/src/lib/invent-middleware/dataIngester.ts`
- Types: `/web/src/lib/types.ts`
- Format Utilities: `/web/src/lib/format.ts`

## Conclusion

MomentoFX provides forex traders with a professional trading interface for crash games by leveraging the Momento Core platform's robust infrastructure. The strict middleware pattern ensures clean separation from the main system while providing access to all platform features. The component-based architecture allows for easy extension and customization, making it an ideal foundation for forex-style crash trading applications.

