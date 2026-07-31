# Mega Pressure Tracker - Invention Documentation

## Overview
Mega Pressure Tracker is an advanced invention that intelligently calculates and represents mini moonshot pressure and related factors between mega rounds (50x+), using the new linguistics system.

## Unique Features

### 1. Intelligent Pressure Calculation
- **Energy Buildup**: Measures high-energy round concentration in recent history
- **Shape Consistency**: Analyzes trend consistency across recent rounds
- **Band Momentum**: Tracks upward band movements indicating upward pressure
- **Time Decay**: Calculates pressure increase based on time since last mega
- **Gap Factor**: Considers average rounds between mega events

### 2. Mini Moonshot Analysis
- **Ignition Tracking** (10x-20x): Counts ignition rounds between megas
- **Moonshot Tracking** (20x-50x): Counts moonshot rounds between megas
- **Pattern Detection**: Identifies mini moonshot clustering patterns
- **Pre-Mega Patterns**: Detects ignition patterns before mega events

### 3. Range Filtering
- Filter mega rounds by multiplier ranges:
  - 50x-100x (Mega)
  - 100x-500x
  - 500x-1000x
  - 1000x+ (Cosmic)
- Real-time filtering without page reload
- Dynamic statistics based on selected range

### 4. Backtest Integration
- Historical validation of pressure predictions
- Pressure accuracy metrics
- Mega prediction rate
- False positive rate tracking
- Configurable window size and minimum mega threshold

### 5. ETA Tracking
- Average mega gap calculation
- Expected rounds until next mega
- Time-based predictions
- Confidence intervals

## Architecture

### Middleware Layer
```
Data Ingester → Mega Pressure Analyzer → React Query Hooks → UI Adapter
```

### Pressure Calculation Algorithm
```
Pressure = (Energy Buildup × 0.3) + 
           (Shape Consistency × 0.2) + 
           (Band Momentum × 0.2) + 
           (Time Decay × 0.2) + 
           (Gap Factor × 0.1)
```

### Data Flow
1. **Data Ingester**: Fetches rounds from main system API (read-only)
2. **Mega Pressure Analyzer**: 
   - Filters mega rounds by range
   - Calculates gaps between megas
   - Counts mini moonshots
   - Computes pressure factors
3. **React Query Hooks**: Manages state and caching
4. **UI Adapter**: Renders charts and statistics

### Linguistics Integration
- Uses Momento linguistics band classification
- Bands: dust, floor, low, base, mid, high, ignition, moonshot, mega, cosmic
- Energy levels: snuffed, damp, steady, charged, surging, explosive, runaway
- Shape analysis: seed, shelf, ramp, slide, edge-spike, arch

## Technical Implementation

### Technologies
- React 18 + TypeScript
- shadcn/ui + TailwindCSS
- React Query for data fetching
- Lucide React for icons
- Custom middleware processors

### API Endpoints Used (Read-Only)
- `/api/v1/rounds` - Round data
- `/api/v1/analysis` - Analysis data
- `/api/v1/backtest/run` - Backtest execution
- `/api/v1/backtest/runs` - Backtest results

### Pressure Metrics
- **Current Pressure**: 0-1 scale, indicates immediate mega likelihood
- **Avg Mega Gap**: Average rounds between mega events
- **Avg Mini Moonshots**: Average mini moonshots per mega gap
- **Energy Buildup**: High-energy round concentration
- **Shape Consistency**: Trend consistency score
- **Band Momentum**: Upward band movement rate
- **Time Decay**: Time-based pressure increase

## Usage

### Access
Navigate to `/dashboard/mega-pressure` in the main system dashboard.

### Features
1. **Range Filter**: Select mega multiplier range to analyze
2. **Pressure Analysis Tab**: View pressure timeline and factors
3. **Mega Distribution Tab**: See mega round distribution and timing
4. **Mini Moonshots Tab**: Analyze mini moonshot patterns
5. **Backtest Results Tab**: Run and view backtest validation

### Backtest Configuration
- **Window Size**: Number of rounds per backtest window (default: 1000)
- **Min Mega**: Minimum multiplier to count as mega (default: 50)

## Performance
- Polling interval: 10 seconds for pressure analysis
- Caching: React Query with appropriate stale times
- Rate limiting: Built into data ingester
- Backtest: Manual trigger with configurable parameters

## Success Criteria Met
- ✅ Unique pressure calculation algorithm
- ✅ Linguistics system integration
- ✅ Range filtering capabilities
- ✅ Backtest integration
- ✅ ETA tracking for next mega
- ✅ Mini moonshot pattern detection
- ✅ Professional UI with charts
- ✅ Complete end-to-end functionality
- ✅ Fully documented
- ✅ Integrated via main system menu and route
- ✅ Zero main system modifications (except menu/route)

## Future Enhancements
- Machine learning model for pressure prediction
- Custom pressure factor weights
- Alert system for high-pressure events
- Export functionality for pressure data
- Historical pressure comparison
- Real-time WebSocket integration
