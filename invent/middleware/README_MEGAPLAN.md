# Megaplan Moonshot Prediction System

## Overview
The Megaplan Moonshot Prediction System is a sophisticated prediction engine that analyzes multiplier sequences, time-based candlesticks, momentum patterns, and market state to forecast moonshot events using computed consensus correlation.

## Components

### 1. Type Definitions (`megaplan-types.ts`)
- Comprehensive TypeScript interfaces for the entire system
- Main prediction types, sequence analysis, candlestick data, momentum analysis, market state classification
- Error types and configuration interfaces

### 2. Time-Based Candlestick Processor (`timeBasedCandlestickProcessor.ts`)
- Creates candlesticks using fixed time durations (1m, 5m, 15m, 1h, 4h, 1D)
- Calculates round time from previous to current round
- Handles large multipliers spanning multiple timeframes with proportional division
- Provides candlestick statistics and pattern detection

### 3. Sequence Angle Analyzer (`sequenceAngleAnalyzer.ts`)
- Analyzes multiplier sequences using rate of change patterns
- Calculates sequence angle to determine market direction
- Detects sequence patterns (geometric, arithmetic, exponential, irregular)
- Predicts forward market structure based on historical patterns
- Uses short-term data (100-500 rounds) for balanced performance

### 4. Momentum Compression Analyzer (`momentumCompressionAnalyzer.ts`)
- Predicts momentum using distance between release rounds
- Computes compression vs release point patterns
- Analyzes patterns like: 1x, 1x, 1x, 12x, 1x, 1x, 15x, 1x, 13x, 150x
- Forecasts clusters based on momentum and compression ratios
- Calculates cluster probability and expected timing

### 5. Market State Classifier (`marketStateClassifier.ts`)
- Classifies market state (compression/release/transition)
- Analyzes energy buildup indicators (volatility, frequency, magnitude, timing)
- Detects state transition signals
- Integrates with linguistics-style band classification

### 6. Megaplan Prediction Engine (`megaplanPrediction.ts`)
- Main orchestrator that coordinates all analysis factors
- Implements computed consensus correlation (weighted average of valid factors)
- Generates unified predictions with confidence scoring
- Provides detailed consensus information and factor analysis

## Usage

### Basic Prediction
```typescript
import { megaplanPredictionEngine } from './megaplanPrediction';

const prediction = await megaplanPredictionEngine.generatePrediction('aviator');
console.log('Market State:', prediction.market_state);
console.log('Next Range:', prediction.next_range_targets);
console.log('Consensus Score:', prediction.consensus_score);
```

### Detailed Prediction with Factor Analysis
```typescript
const detailed = await megaplanPredictionEngine.generateDetailedPrediction('aviator');
console.log('Prediction:', detailed.prediction);
console.log('Consensus:', detailed.consensus);
console.log('Individual Factors:', detailed.factors);
```

### Individual Component Analysis
```typescript
import { sequenceAngleAnalyzer } from './sequenceAngleAnalyzer';
import { momentumCompressionAnalyzer } from './momentumCompressionAnalyzer';
import { marketStateClassifier } from './marketStateClassifier';
import { timeBasedCandlestickProcessor } from './timeBasedCandlestickProcessor';

// Sequence analysis
const sequenceAnalysis = await sequenceAngleAnalyzer.analyzeSequence('aviator');

// Momentum analysis
const momentumAnalysis = await momentumCompressionAnalyzer.analyzeMomentumCompression('aviator');

// Market state classification
const marketState = await marketStateClassifier.classifyMarketState('aviator');

// Time-based candlesticks
const candlesticks = await timeBasedCandlestickProcessor.createCandlesticks('aviator', '5m');
```

### Configuration
```typescript
import { megaplanPredictionEngine } from './megaplanPrediction';

// Update configuration
megaplanPredictionEngine.updateConfig({
  analysis_window: 500,
  timeframes: ['1m', '5m', '15m', '1h'],
  computed_consensus: true,
  confidence_threshold: 0.75,
  performance_mode: 'balanced'
});

// Get current configuration
const config = megaplanPredictionEngine.getConfig();

// Reset to defaults
megaplanPredictionEngine.resetConfig();
```

## Computed Consensus Mechanism

The system uses computed consensus correlation where prediction factors contribute to a weighted consensus score:

- **Sequence Angle** (30% weight): Must have valid angle, clear direction, and sufficient confidence
- **Momentum Compression** (30% weight): Must have sufficient momentum score and cluster probability
- **Time Candlestick** (20% weight): Must have significant patterns or volatility
- **Market State** (20% weight): Must have clear state classification and energy buildup

The consensus score is calculated as a weighted average of valid factors' confidence scores. Invalid factors contribute 0 to the consensus score but don't invalidate the entire prediction. This allows the system to provide meaningful predictions even when some factors are uncertain.

## Integration Points

### 1. Main Prediction Pipeline (Control Panel)
- Integrate megaplan predictions into the main control panel prediction display
- Show consensus score and individual factor validity
- Provide detailed explanations for predictions

### 2. Moonshot Finder
- Add sequence angle visualization to moonshot detection
- Enhance moonshot probability using consensus-based predictions
- Show momentum compression patterns and cluster predictions
- Display market state context for moonshot opportunities

### 3. Frontend Components
- Create React components for prediction display
- Add visualization for sequence angles and market state
- Implement real-time updates using WebSocket
- Provide configuration UI for analysis parameters

## Performance Characteristics

- **Analysis Window**: 100-500 rounds (configurable)
- **Timeframes**: Standard trading timeframes (1m, 5m, 15m, 1h, 4h, 1D)
- **Performance Mode**: Balanced approach (accuracy vs speed tradeoff)
- **Strict Consensus**: Ensures high-confidence predictions only

## Testing

A test script is provided in `test_megaplan.ts` to verify core functionality:

```bash
# Run the test (requires TypeScript environment)
npx ts-node invent/middleware/test_megaplan.ts
```

The test verifies:
- Sequence angle analysis with custom sequences
- Momentum compression analysis
- Market state classification
- Candlestick processor functionality
- Prediction engine configuration

## Future Enhancements

1. **Machine Learning Integration**: Add ML models for pattern recognition
2. **Multi-Source Analysis**: Analyze multiple data sources simultaneously
3. **Real-Time Adaptation**: Dynamic adjustment of analysis parameters
4. **Backtesting Framework**: Comprehensive historical validation
5. **Advanced Visualization**: Enhanced charts and interactive displays

## Error Handling

All components include comprehensive error handling with specific error types:

- `MegaplanError`: Base error class
- `SequenceAnalysisError`: Sequence analysis failures
- `CandlestickProcessingError`: Candlestick processing failures
- `MomentumAnalysisError`: Momentum analysis failures
- `ConsensusError`: Consensus calculation failures

## Dependencies

- `dataIngester`: For fetching round data from the main system
- Existing technical indicators and pattern recognition utilities
- React Query for frontend data fetching (hooks provided as comments)

## Notes

- The system is designed to work with the existing Momento Core architecture
- All components follow the middleware pattern (no direct system modifications)
- Performance is optimized for balanced accuracy and speed
- Strict consensus ensures high-confidence predictions only