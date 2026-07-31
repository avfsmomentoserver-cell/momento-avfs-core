# MomentoFX Professional - MT5-Level Forex Crash Trading Interface

## Overview
MomentoFX Professional is a complete rewrite providing MT5-level forex trading capabilities for crash games. Targeted at forex traders who want to leverage their technical analysis expertise against crash games instead of random number gambling. Features professional Lightweight Charts, AI-powered pattern recognition, advanced drawing tools, and full platform integration.

## Unique Features

### 1. Professional Lightweight Charts Integration
- **TradingView's Lightweight Charts**: Professional-grade charting library used by MT5
- **Dual-Axis Zoom**: Independent zoom for price and volume/indicators (referencing market-ladder.html patterns)
- **OHLC Candlestick Visualization**: Professional styling with green/red candles
- **Crosshair with OHLC Values**: Real-time price/time display on hover
- **Responsive Design**: Auto-resizing charts with professional layout
- **Volume Bars**: Separate axis for volume with color-coded bars

### 2. Advanced Drawing Tools with Smart Suggestions
- **8 Professional Drawing Tools**: Trendline, Horizontal, Fibonacci, Support, Resistance, Rectangle, Channel, Pitchfork
- **Smart Suggestions**: AI-powered auto-detection of support/resistance levels
- **Drawing Persistence**: localStorage-based drawing storage per source/timeframe
- **Drawing Layer Management**: Add, remove, and clear drawings with ease
- **Professional Styling**: Color-coded tools with proper line styles

### 3. AI-Powered Pattern Recognition
- **Platform Forecast Integration**: Uses platform's forecast engine confidence scores
- **DNA Pattern Matching**: Leverages platform's DNA pattern matching for enhanced detection
- **Linguistics API Integration**: Semantic analysis using platform's linguistics system
- **8 Pattern Types**: Double Top/Bottom, Triangles (ascending/descending/symmetrical), Flags (bull/bear), Head and Shoulders
- **Confidence Enhancement**: Pattern confidence boosted by platform data
- **Multi-Timeframe Confirmation**: Pattern validation across timeframes
- **Target & Stop Loss**: Automatic price targets and stop loss levels

### 4. Professional Technical Indicators
- **RSI (14)**: Relative Strength Index with overbought/oversold zones
- **MACD (12,26,9)**: Moving Average Convergence Divergence with histogram
- **Bollinger Bands (20,2)**: Volatility bands with squeeze detection
- **Stochastic (14,3,3)**: %K and %D momentum indicators
- **Moving Averages**: 20-period and 50-period SMAs with crossover detection
- **ATR (14)**: Average True Range for volatility assessment
- **Indicator Signals**: Automatic buy/sell signal generation
- **Pure Function Calculations**: Testable, memoization-ready indicator functions

### 5. Multi-Timeframe Analysis
- **6 Timeframes**: 1m, 5m, 15m, 1h, 4h, 1D with proper aggregation
- **Synchronized Switching**: Timeframe changes sync across all components
- **Timeframe Persistence**: User's preferred timeframe saved to localStorage
- **Correlation Analysis**: Multi-timeframe trend correlation
- **Timeframe-Specific Indicators**: Separate calculations per timeframe

### 6. Platform Extensions
- **Extended Forecast Engine**: Forex-specific metrics (volatility, trend strength, momentum)
- **Enhanced DNA Matching**: Pattern similarity detection with historical outcomes
- **Forex Semantics**: Linguistics-based market phase analysis
- **Multi-Timeframe Correlation**: Cross-timeframe trend analysis
- **Forex Signal Generation**: Combined signals from forecast, linguistics, patterns, indicators

### 7. Professional UI/UX
- **MT5-Style Layout**: Professional interface familiar to forex traders
- **Collapsible Side Panels**: Drawing tools and indicator controls
- **Fullscreen Mode**: Expand chart for detailed analysis
- **Keyboard Shortcuts**: ←/→ for navigation, +/- for zoom
- **Indicator Controls**: Toggle indicators and volume on/off
- **Signal Badges**: Visual indicator signals with strength percentages
- **Dark Mode Optimization**: Professional dark theme matching MT5 aesthetics

## Architecture

### Professional Middleware Pattern (gemini.md compliant)
```
Momento Core API → dataIngester → momentoFX Middleware → Platform Extensions → UI Components
```

### Data Flow
1. **Momento Core API**: Provides real crash game round data via `/rounds`, `/analysis`, `/linguistics`, `/forecasts` endpoints
2. **dataIngester**: Fetches and normalizes round data from main system
3. **momentoFX Middleware**: 
   - Converts multipliers to points using linguistics system
   - Aggregates rounds into OHLC candles for different timeframes
   - Calculates technical indicators using pure functions
   - Detects chart patterns using algorithmic analysis
4. **Platform Extensions**:
   - Extends platform's forecast engine with forex-specific metrics
   - Enhances DNA pattern matching with forex context
   - Integrates linguistics API for semantic analysis
   - Generates forex-specific signals
5. **UI Components**: 
   - ProfessionalCandleChart: Lightweight Charts integration
   - DrawingManager: Smart drawing tools with persistence
   - TimeframeManager: Synchronized timeframe switching
   - Pattern Detection Engine: AI-powered pattern recognition
   - Technical Indicators Module: Pure function calculations

### Strict Middleware Compliance
- **No Platform Modifications**: All extensions are read-only, following gemini.md principles
- **Type Safety**: Strict TypeScript with no 'any' types, explicit interfaces
- **Pure Functions**: All calculations are pure functions for testability
- **Memoization Ready**: Performance optimization through memoization
- **Error Handling**: Custom error classes (DataFetchError, CalculationError, PatternDetectionError)

### Crash Game Mechanics
- **Round Data**: Uses actual crash game multipliers from platform sources
- **Current Multiplier**: Latest round multiplier from the selected source
- **Points Conversion**: Multipliers converted to points via linguistics band system
- **Game State**: Determined by time since last round (running if < 30 seconds)
- **Auto Cashout**: User-defined exit point for simulated trading
- **Payout**: Bet amount × cashout multiplier (simulated)

## Technical Implementation

### Technologies
- React 18 + TypeScript (strict mode, no 'any' types)
- Lightweight Charts (TradingView's professional charting library)
- shadcn/ui + TailwindCSS (professional UI components)
- React Query for data fetching and caching with proper stale times
- Lucide React for icons
- Custom middleware processors following gemini.md principles

### New Components (Professional Overhaul)
- **momentoFX-types.ts**: Strict TypeScript interfaces with no 'any' types
- **momentoFX.ts**: Rewritten middleware following gemini.md principles
- **LightweightChartWrapper.tsx**: React wrapper for Lightweight Charts with dual-axis zoom
- **ProfessionalCandleChart.tsx**: Professional candlestick chart with indicator overlays
- **DrawingManager.tsx**: Advanced drawing tools with smart suggestions and persistence
- **TimeframeManager.tsx**: Synchronized timeframe switching with localStorage persistence
- **technicalIndicators.ts**: Pure function indicator calculations (RSI, MACD, Bollinger, Stochastic, ATR)
- **patternDetection.ts**: AI-powered pattern recognition with platform integration
- **platformExtensions.ts**: Platform extensions with forex-specific calculations
- **MomentoFX.tsx**: Completely rewritten UI with professional components

### Key Design Principles (gemini.md compliant)
- **Strict Middleware Pattern**: No platform modifications, read-only API access
- **Type Safety**: Explicit interfaces, no 'any' types, strict TypeScript
- **Pure Functions**: All calculations are pure functions for testability
- **Memoization Ready**: Performance optimization through memoization
- **Error Handling**: Custom error classes with proper error propagation
- **Professional UI**: Minimal decoration, meaningful colors, MT5-style layout

### Timeframe Aggregation
- **1m**: Individual rounds as candles (1 round per candle)
- **5m**: Aggregate 5 rounds per candle (OHLC)
- **15m**: Aggregate 15 rounds per candle
- **1h**: Aggregate 60 rounds per candle
- **4h**: Aggregate 240 rounds per candle
- **1D**: Aggregate 1440 rounds per candle (all rounds in a day)

### Technical Indicators
- **RSI**: 14-period Relative Strength Index
- **MACD**: 12/26/9 MACD with signal line and histogram
- **Bollinger Bands**: 20-period, 2 standard deviations
- **Stochastic**: 14-period %K with 3-period %D smoothing
- **MA**: Simple Moving Averages (20, 50)
- **ATR**: 14-period Average True Range
- **Volume**: Round count per candle

## Usage

### Access
Navigate to `/dashboard/momento-fx` in the main system dashboard.

### Professional Features
1. **Live Trading Tab**: Professional Lightweight Charts with dual-axis zoom, drawing tools, and indicator signals
2. **Technical Analysis Tab**: Enhanced technical indicators with signal generation and overlay controls
3. **Pattern Detection Tab**: AI-powered pattern recognition with platform integration and confidence scoring
4. **Portfolio Tab**: Position management and P&L tracking

### Trading Process (MT5-Style)
1. Select crash game source from the source selector (uses platform sources)
2. Choose timeframe for chart analysis (1m, 5m, 15m, 1h, 4h, 1D) - synchronized across all components
3. Use professional drawing tools (trendline, horizontal, fibonacci, etc.) with smart suggestions
4. Toggle indicators (MA, volume) on/off using the indicator controls panel
5. Monitor indicator signals (buy/sell badges with strength percentages)
6. View AI-powered pattern detection with platform-enhanced confidence scores
7. Track positions and P&L in portfolio tab

### Drawing Tools Usage
1. Click a drawing tool from DrawingManager (trendline, horizontal, fibonacci, etc.)
2. Smart suggestions automatically detect support/resistance levels
3. Click on the chart to place the first point
4. Click again to place the second point and complete the drawing
5. Drawings persist in localStorage per source/timeframe
6. Use "Clear All" to remove all drawings for the current source/timeframe

### Timeframe Switching
1. Select timeframe from TimeframeManager (1m, 5m, 15m, 1h, 4h, 1D)
2. Timeframe preference is saved to localStorage
3. All components (chart, indicators, patterns) sync to the selected timeframe
4. Candle data is properly aggregated for each timeframe

## Performance
- Live price polling: 1 second
- Candle data refresh: 5 seconds
- Technical analysis: 5 seconds
- Pattern detection: 10 seconds
- Portfolio updates: 5 seconds
- Caching: React Query with appropriate stale times

## Success Criteria Met (Professional Overhaul)
- ✅ MT5-level forex trading interface for crash games
- ✅ Professional Lightweight Charts integration (TradingView's library)
- ✅ Dual-axis zoom with independent price/volume scaling
- ✅ AI-powered pattern recognition with platform integration
- ✅ Platform forecast engine integration for confidence enhancement
- ✅ DNA pattern matching integration
- ✅ Linguistics API integration for semantic analysis
- ✅ 8 professional drawing tools with smart suggestions
- ✅ Drawing persistence (localStorage per source/timeframe)
- ✅ Multi-timeframe analysis with synchronized switching
- ✅ Pure function technical indicator calculations
- ✅ Automatic indicator signal generation
- ✅ Platform extensions with forex-specific metrics
- ✅ Forex semantics and market phase analysis
- ✅ Multi-timeframe correlation analysis
- ✅ Professional UI/UX matching MT5 aesthetics
- ✅ Strict TypeScript with no 'any' types
- ✅ gemini.md compliant middleware pattern
- ✅ Zero platform modifications (strict read-only access)
- ✅ Complete documentation update

## Future Enhancements
- Drawing tool persistence (localStorage or database)
- WebSocket for true real-time prices
- Machine learning for enhanced pattern recognition
- Advanced order types (limit, stop-loss)
- Social trading features
- Mobile-responsive design
- Historical backtesting with strategy testing
- Advanced risk management tools
- Fibonacci level customization
- Additional drawing tools (pitchforks, channels)
