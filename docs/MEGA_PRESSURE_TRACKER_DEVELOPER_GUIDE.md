# Mega Pressure Tracker - Developer Guide

## Overview

Mega Pressure Tracker is an advanced analytics invention that predicts and analyzes mega events (high multiplier rounds) in crash games. It uses sophisticated statistical algorithms to calculate pressure metrics, forecast ETA to next mega, predict multiplier ranges, determine bankroll requirements, and generate intelligent chase strategies.

## Value Proposition for Traders

Mega Pressure Tracker provides traders with professional-grade analytics:

1. **Pressure Analysis**: Real-time pressure metrics indicating mega event likelihood
2. **ETA Forecasting**: Predicts rounds and time to next mega with confidence intervals
3. **Range Prediction**: Predicts multiplier ranges with probability distributions
4. **Bankroll Calculator**: Risk-managed bankroll requirements for different strategies
5. **Chase Strategy**: Intelligent betting sequences for chasing mega events
6. **Backtest Validation**: Historical validation of all predictions

## Platform Integration

### Data Flow Architecture

```
Momento Core API → dataIngester → megaPressure Middleware → UI Components
```

### Leveraged Platform Features

#### 1. Data Ingestion System
Mega Pressure Tracker uses the platform's robust data infrastructure:

- **Sources API**: `/api/v1/sources` - Retrieves configured crash game sources
- **Rounds API**: `/api/v1/rounds` - Fetches historical round data
- **All Rounds API**: `/api/v1/rounds/all` - Fetches up to 100,000 rounds for full analysis
- **Linguistics API**: `/api/v1/linguistics` - Provides multiplier-to-points conversion

**Why this matters**: Traders get reliable, validated data without worrying about data quality issues.

#### 2. Linguistics System
Mega Pressure Tracker leverages the platform's eight-layer semantic vocabulary:

- **Multiplier Normalization**: Converts raw multipliers to semantic points
- **Band Classification**: Categorizes multipliers into meaningful bands (ignition, moonshot, mega, cosmic, etc.)
- **Pattern Recognition**: Uses linguistic tokens for enhanced pattern detection

**Why this matters**: Traders get familiar semantic categories that map to their trading terminology.

#### 3. Pressure Calculation Engine
Mega Pressure Tracker implements a proprietary pressure algorithm:

- **Energy Buildup**: Measures cumulative multiplier energy between megas
- **Shape Consistency**: Analyzes pattern consistency in multiplier distribution
- **Band Momentum**: Tracks momentum across different bands
- **Time Decay**: Accounts for time-based pressure decay
- **Current Pressure**: Weighted combination of all factors (0-1 scale)

**Why this matters**: Traders get a sophisticated metric that predicts mega event likelihood.

## Technical Architecture

### Middleware Layer

#### File: `web/src/lib/invent-middleware/megaPressure.ts`

The middleware layer is the core of Mega Pressure Tracker, following the platform's strict middleware pattern:

**Key Components**:

1. **Data Fetching**
   - `getMegaRounds()`: Fetches mega rounds within specified range
   - `getLatestSessionTopRounds()`: Gets top rounds from latest session
   - `getTopRoundsByDay()`: Gets top rounds for a specific day
   - `calculatePressure()`: Computes pressure metrics
   - `runBacktest()`: Validates pressure predictions historically

2. **Advanced Calculations**
   - `calculateETAPrediction()`: Predicts rounds and time to next mega
   - `calculateRangePrediction()`: Predicts multiplier ranges with confidence intervals
   - `calculateBankrollRequirements()`: Calculates bankroll for different risk levels
   - `calculateChaseStrategy()`: Generates intelligent chase strategies
   - `runChaseBacktest()`: Validates chase strategies historically

3. **Pressure Calculation Factors**
   - Energy Buildup: Cumulative multiplier energy
   - Shape Consistency: Pattern consistency analysis
   - Band Momentum: Momentum across bands
   - Time Decay: Time-based pressure decay
   - Current Pressure: Weighted combination (0-1)

4. **React Query Hooks**
   - `useMegaRounds()`: Mega rounds data with 10s refresh
   - `usePressureAnalysis()`: Pressure metrics with 10s refresh
   - `useBacktestResults()`: Backtest data with 10s refresh
   - `useETAPrediction()`: ETA forecast with 10s refresh
   - `useRangePrediction()`: Range prediction with 10s refresh
   - `useBankrollRequirements()`: Bankroll data with 10s refresh
   - `useChaseStrategy()`: Chase strategy with 10s refresh
   - `useChaseBacktest()`: Chase backtest with 10s refresh
   - `useLatestSessionTopRounds()`: Latest top rounds with 10s refresh
   - `useTopRoundsByDay()`: Top rounds by day with 10s refresh

### UI Components

#### File: `web/src/pages/dashboard/MegaPressureTracker.tsx`

Main UI page integrating all components:

**Tabs**:
1. **Pressure Analysis**: Pressure timeline, factors, and mini moonshot patterns
2. **Mega Distribution**: Mega round distribution and recent mega rounds
3. **Mini Moonshots**: Mini moonshot analysis and patterns
4. **ETA Forecast**: Predicted time to next mega with confidence intervals
5. **Range Analysis**: Predicted multiplier ranges with probability distribution
6. **Bankroll Calculator**: Risk-managed bankroll requirements
7. **Chase Strategy**: Intelligent betting strategies for chasing megas
8. **Backtest Results**: Historical validation of predictions

**Features**:
- Source selection (uses platform sources)
- Mega range filtering (min/max multiplier)
- Fullscreen mode for comprehensive analysis
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

#### Rounds
```typescript
GET /api/v1/rounds?source={source}&limit={limit}
Response: {
  rounds: RoundRecord[]
}
```

#### All Rounds (Full Analysis)
```typescript
GET /api/v1/rounds/all?source={source}&limit={limit}
Response: {
  rounds: RoundRecord[]
}
// Supports up to 100,000 rounds
```

#### Linguistics
```typescript
GET /api/v1/linguistics?source={source}
Response: {
  tokens: LinguisticsToken[]
}
```

## Calculation Methodologies

### Pressure Calculation

The pressure algorithm combines multiple factors:

```typescript
function calculateCurrentPressure(
  energyBuildup: number,
  shapeConsistency: number,
  bandMomentum: number,
  timeDecay: number,
  avgMegaGap: number
): number {
  // Weighted combination of factors
  const weights = {
    energy: 0.3,
    shape: 0.25,
    momentum: 0.25,
    time: 0.2
  };
  
  return (
    energyBuildup * weights.energy +
    shapeConsistency * weights.shape +
    bandMomentum * weights.momentum +
    timeDecay * weights.time
  );
}
```

**Pressure Levels**:
- 0.8-1.0: Critical (high mega likelihood)
- 0.6-0.8: High
- 0.4-0.6: Moderate
- 0.0-0.4: Low

### ETA Prediction

ETA prediction uses three methods with weighted combination:

```typescript
function calculateETAPrediction(megaRounds: MegaRound[]): ETAPrediction {
  // Method 1: Historical Average
  const avgGap = calculateAverageGap(megaRounds);
  
  // Method 2: Pressure-Adjusted
  const pressureAdjusted = avgGap * (1 - currentPressure);
  
  // Method 3: Time-Decay Adjusted
  const timeDecayAdjusted = avgGap * timeDecayFactor;
  
  // Weighted combination
  const rounds_eta = (
    avgGap * 0.4 +
    pressureAdjusted * 0.35 +
    timeDecayAdjusted * 0.25
  );
  
  // Convert to time (assuming ~6 seconds per round)
  const time_eta_minutes = (rounds_eta * 6) / 60;
  
  // Calculate confidence intervals using standard deviation
  const stdDev = calculateStandardDeviation(gaps);
  const confidence_50 = {
    min_rounds: rounds_eta - 0.67 * stdDev,
    max_rounds: rounds_eta + 0.67 * stdDev,
    min_time: (rounds_eta - 0.67 * stdDev) * 6 / 60,
    max_time: (rounds_eta + 0.67 * stdDev) * 6 / 60
  };
  
  // Similar for 75% (1.15 stdDev) and 95% (1.96 stdDev)
  
  return {
    rounds_eta,
    time_eta_minutes,
    confidence_50,
    confidence_75,
    confidence_95,
    methodology: "Weighted combination of historical average, pressure-adjusted, and time-decay adjusted predictions"
  };
}
```

### Range Prediction

Range prediction uses percentile analysis:

```typescript
function calculateRangePrediction(megaRounds: MegaRound[]): RangePrediction {
  const multipliers = megaRounds.map(r => r.crash_point);
  
  // Calculate percentiles
  const p25 = calculatePercentile(multipliers, 25);
  const p50 = calculatePercentile(multipliers, 50);
  const p75 = calculatePercentile(multipliers, 75);
  const p95 = calculatePercentile(multipliers, 95);
  
  // Predicted range (interquartile range)
  const predicted_range = {
    min: p25,
    max: p75
  };
  
  // Confidence intervals
  const confidence_intervals = {
    p50: { min: p25, max: p50 },
    p75: { min: p25, max: p75 },
    p95: { min: p25, max: p95 }
  };
  
  // Probability distribution across bands
  const probability_distribution = {
    ignition: multipliers.filter(m => m >= 10 && m < 20).length / multipliers.length,
    moonshot: multipliers.filter(m => m >= 20 && m < 50).length / multipliers.length,
    mega: multipliers.filter(m => m >= 50 && m < 100).length / multipliers.length,
    cosmic: multipliers.filter(m => m >= 100 && m < 500).length / multipliers.length,
    galactic: multipliers.filter(m => m >= 500).length / multipliers.length
  };
  
  // Historical accuracy (how often actual falls in predicted range)
  const historical_accuracy = calculateHistoricalAccuracy(megaRounds);
  
  return {
    predicted_range,
    confidence_intervals,
    probability_distribution,
    historical_accuracy,
    methodology: "Percentile-based range prediction with confidence intervals"
  };
}
```

### Bankroll Requirements

Bankroll calculation for different risk levels:

```typescript
function calculateBankrollRequirements(megaRounds: MegaRound[]): BankrollRequirement {
  const baseBet = 1;
  const avgMega = calculateAverage(megaRounds.map(r => r.crash_point));
  const avgGap = calculateAverageGap(megaRounds);
  
  // Risk levels
  const risk_levels = {
    conservative: {
      risk_pct: 0.005, // 0.5% risk per trade
      min_bankroll: Math.ceil(baseBet / 0.005),
      max_loss: Math.ceil(baseBet / 0.005),
      recommended: false
    },
    moderate: {
      risk_pct: 0.02, // 2% risk per trade
      min_bankroll: Math.ceil(baseBet / 0.02),
      max_loss: Math.ceil(baseBet / 0.02),
      recommended: true
    },
    aggressive: {
      risk_pct: 0.05, // 5% risk per trade
      min_bankroll: Math.ceil(baseBet / 0.05),
      max_loss: Math.ceil(baseBet / 0.05),
      recommended: false
    }
  };
  
  // Strategy recommendation based on volatility
  const volatility = calculateVolatility(megaRounds);
  let strategy_recommendation = "";
  if (volatility < 0.5) {
    strategy_recommendation = "Low volatility detected. Moderate risk strategy recommended for balanced growth.";
  } else if (volatility < 1.0) {
    strategy_recommendation = "Moderate volatility detected. Conservative strategy recommended for capital preservation.";
  } else {
    strategy_recommendation = "High volatility detected. Aggressive strategy may be suitable for experienced traders.";
  }
  
  // Recovery rounds (rounds to recover from max loss)
  const recovery_rounds = Math.ceil(avgGap * 2);
  
  return {
    base_bet: baseBet,
    risk_levels,
    strategy_recommendation,
    recovery_rounds,
    methodology: "Risk-based bankroll calculation with volatility-adjusted strategy recommendation"
  };
}
```

### Chase Strategy

Chase strategy generates intelligent betting sequences:

```typescript
function calculateChaseStrategy(config: ChaseConfig): ChaseStrategy {
  const strategies = {
    conservative: {
      name: "Conservative Chase",
      description: "Low-risk chase with small bet growth and tight stop loss",
      parameters: {
        max_chase_rounds: 5,
        stop_loss_multiplier: 10,
        profit_target_multiplier: 50,
        bet_growth_rate: 1.5
      }
    },
    moderate: {
      name: "Moderate Chase",
      description: "Balanced chase with moderate bet growth and reasonable stop loss",
      parameters: {
        max_chase_rounds: 10,
        stop_loss_multiplier: 20,
        profit_target_multiplier: 100,
        bet_growth_rate: 2.0
      }
    },
    aggressive: {
      name: "Aggressive Chase",
      description: "High-risk chase with rapid bet growth and loose stop loss",
      parameters: {
        max_chase_rounds: 15,
        stop_loss_multiplier: 50,
        profit_target_multiplier: 500,
        bet_growth_rate: 3.0
      }
    }
  };
  
  const strategy = strategies[config.strategy];
  const bet_sequence = generateBetSequence(strategy.parameters);
  
  // Expected outcomes
  const expected_outcomes = {
    success_rate: calculateSuccessRate(strategy.parameters),
    avg_profit: calculateAverageProfit(bet_sequence),
    max_loss: calculateMaxLoss(bet_sequence),
    risk_reward_ratio: calculateRiskRewardRatio(bet_sequence)
  };
  
  // Recommendation score (0-1)
  const recommendation_score = calculateRecommendationScore(strategy, expected_outcomes);
  
  return {
    name: strategy.name,
    description: strategy.description,
    parameters: strategy.parameters,
    bet_sequence,
    expected_outcomes,
    recommendation_score,
    methodology: "Geometric bet progression with configurable risk parameters"
  };
}

function generateBetSequence(params: ChaseStrategyParameters): BetSequence[] {
  const sequence = [];
  let currentBet = 1;
  let cumulative = 0;
  
  for (let i = 1; i <= params.max_chase_rounds; i++) {
    cumulative += currentBet;
    sequence.push({
      round: i,
      bet: currentBet,
      cumulative
    });
    currentBet *= params.bet_growth_rate;
  }
  
  return sequence;
}
```

## TypeScript Interfaces

### Core Types

```typescript
interface MegaRound {
  id: string;
  crash_point: number;
  band: string;
  timestamp: string;
  gap_to_next: number | null;
}

interface PressureMetrics {
  current_pressure: number;
  avg_mega_gap: number;
  avg_mini_moonshots: number;
  energy_buildup: number;
  shape_consistency: number;
  band_momentum: number;
  time_decay: number;
  pressure_history: number[];
  mini_distribution: {
    ignition: number;
    moonshot: number;
  };
  mini_patterns: MiniPattern[];
}

interface ETAPrediction {
  rounds_eta: number;
  time_eta_minutes: number;
  confidence_50: ConfidenceInterval;
  confidence_75: ConfidenceInterval;
  confidence_95: ConfidenceInterval;
  methodology: string;
}

interface ConfidenceInterval {
  min_rounds: number;
  max_rounds: number;
  min_time: number;
  max_time: number;
}

interface RangePrediction {
  predicted_range: { min: number; max: number };
  confidence_intervals: {
    p50: { min: number; max: number };
    p75: { min: number; max: number };
    p95: { min: number; max: number };
  };
  probability_distribution: {
    ignition: number;
    moonshot: number;
    mega: number;
    cosmic: number;
    galactic: number;
  };
  historical_accuracy: number;
  methodology: string;
}

interface BankrollRequirement {
  base_bet: number;
  risk_levels: {
    [key: string]: {
      risk_pct: number;
      min_bankroll: number;
      max_loss: number;
      recommended: boolean;
    };
  };
  strategy_recommendation: string;
  recovery_rounds: number;
  methodology: string;
}

interface ChaseStrategy {
  name: string;
  description: string;
  parameters: ChaseStrategyParameters;
  bet_sequence: BetSequence[];
  expected_outcomes: ExpectedOutcomes;
  recommendation_score: number;
  methodology: string;
}

interface ChaseStrategyParameters {
  max_chase_rounds: number;
  stop_loss_multiplier: number;
  profit_target_multiplier: number;
  bet_growth_rate: number;
}

interface BetSequence {
  round: number;
  bet: number;
  cumulative: number;
}

interface ExpectedOutcomes {
  success_rate: number;
  avg_profit: number;
  max_loss: number;
  risk_reward_ratio: number;
}

interface ChaseConfig {
  strategy: 'conservative' | 'moderate' | 'aggressive';
  custom_params?: ChaseStrategyParameters;
}

interface BacktestResult {
  pressure_accuracy: number;
  mega_prediction_rate: number;
  false_positive_rate: number;
  tested_rounds: number;
}
```

## Development Guide

### Adding New Calculation Methods

1. **Add Interface**:
```typescript
// In megaPressure.ts
interface YourNewCalculation {
  // Your interface fields
}
```

2. **Add Calculation Method**:
```typescript
// In MegaPressureAnalyzer class
async calculateYourNewCalculation(source: string, config: YourConfig): Promise<YourNewCalculation> {
  // Your calculation logic
  return result;
}
```

3. **Add React Query Hook**:
```typescript
// Export function
export function useYourNewCalculation(source: string, config: YourConfig) {
  const analyzer = useMemo(() => new MegaPressureAnalyzer(), []);
  return useQuery({
    queryKey: ['yourNewCalculation', source, config],
    queryFn: () => analyzer.calculateYourNewCalculation(source, config),
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL
  });
}
```

4. **Add to UI**:
```typescript
// In MegaPressureTracker.tsx
import { useYourNewCalculation, type YourNewCalculation } from '@/lib/invent-middleware/megaPressure';

const yourNewQuery = useYourNewCalculation(source, config);

// Add tab and content
<TabsTrigger value="yourNew">Your New Tab</TabsTrigger>
<TabsContent value="yourNew">
  {/* Your content */}
</TabsContent>
```

### Adding New Risk Levels

1. **Update Bankroll Calculation**:
```typescript
// In calculateBankrollRequirements
const risk_levels = {
  // existing levels
  your_new_level: {
    risk_pct: 0.03, // Your risk percentage
    min_bankroll: Math.ceil(baseBet / 0.03),
    max_loss: Math.ceil(baseBet / 0.03),
    recommended: false
  }
};
```

2. **Update Strategy Logic**:
```typescript
// Add logic to determine when to recommend your new level
```

### Adding New Chase Strategies

1. **Update Strategy Definitions**:
```typescript
// In calculateChaseStrategy
const strategies = {
  // existing strategies
  your_new_strategy: {
    name: "Your New Strategy",
    description: "Your description",
    parameters: {
      max_chase_rounds: YOUR_VALUE,
      stop_loss_multiplier: YOUR_VALUE,
      profit_target_multiplier: YOUR_VALUE,
      bet_growth_rate: YOUR_VALUE
    }
  }
};
```

2. **Update UI Selector**:
```typescript
// In Chase Strategy tab
<select>
  <option value="conservative">Conservative</option>
  <option value="moderate">Moderate</option>
  <option value="aggressive">Aggressive</option>
  <option value="your_new_strategy">Your New Strategy</option>
</select>
```

### Adding New Confidence Levels

1. **Update ETA Calculation**:
```typescript
// In calculateETAPrediction
const confidence_YOUR_LEVEL = {
  min_rounds: rounds_eta - YOUR_STD_DEV * stdDev,
  max_rounds: rounds_eta + YOUR_STD_DEV * stdDev,
  min_time: (rounds_eta - YOUR_STD_DEV * stdDev) * 6 / 60,
  max_time: (rounds_eta + YOUR_STD_DEV * stdDev) * 6 / 60
};

return {
  // existing
  confidence_YOUR_LEVEL
};
```

2. **Update UI Display**:
```typescript
// In ETA Forecast tab
<div className="flex justify-between items-center">
  <span className="text-sm text-gray-300">YOUR_LEVEL% Confidence:</span>
  <span className="text-sm text-YOUR_COLOR">
    {etaQuery.data.confidence_YOUR_LEVEL.min_rounds}-{etaQuery.data.confidence_YOUR_LEVEL.max_rounds} rounds
  </span>
</div>
```

## Testing

### Unit Tests
Test calculation functions:
```typescript
describe('Mega Pressure Tracker', () => {
  it('should calculate ETA prediction correctly', () => {
    const prediction = calculateETAPrediction(testMegaRounds);
    expect(prediction.rounds_eta).toBeGreaterThan(0);
    expect(prediction.time_eta_minutes).toBeGreaterThan(0);
  });
  
  it('should calculate bankroll requirements correctly', () => {
    const bankroll = calculateBankrollRequirements(testMegaRounds);
    expect(bankroll.risk_levels.conservative.min_bankroll).toBeGreaterThan(0);
    expect(bankroll.risk_levels.moderate.min_bankroll).toBeGreaterThan(0);
    expect(bankroll.risk_levels.aggressive.min_bankroll).toBeGreaterThan(0);
  });
});
```

### Integration Tests
Test API integration:
```typescript
describe('API Integration', () => {
  it('should fetch mega rounds from platform', async () => {
    const analyzer = new MegaPressureAnalyzer();
    const megaRounds = await analyzer.getMegaRounds('test_source', { min: 50, max: Infinity });
    expect(megaRounds.length).toBeGreaterThan(0);
  });
  
  it('should calculate pressure metrics', async () => {
    const analyzer = new MegaPressureAnalyzer();
    const pressure = await analyzer.calculatePressure('test_source', { min: 50, max: Infinity });
    expect(pressure.current_pressure).toBeGreaterThanOrEqual(0);
    expect(pressure.current_pressure).toBeLessThanOrEqual(1);
  });
});
```

### UI Tests
Test component rendering:
```typescript
describe('MegaPressureTracker', () => {
  it('should render all tabs', () => {
    render(<MegaPressureTracker />);
    expect(screen.getByText('Pressure Analysis')).toBeInTheDocument();
    expect(screen.getByText('ETA Forecast')).toBeInTheDocument();
    expect(screen.getByText('Range Analysis')).toBeInTheDocument();
    expect(screen.getByText('Bankroll Calculator')).toBeInTheDocument();
    expect(screen.getByText('Chase Strategy')).toBeInTheDocument();
  });
});
```

## Performance Optimization

### React Query Caching
```typescript
// Configure stale times for optimal performance
useETAPrediction(source, megaRange, fullscreen, {
  staleTime: 10000, // 10 seconds
  refetchInterval: 10000,
});
```

### Memoization
```typescript
// Memoize expensive calculations
const pressureMetrics = useMemo(() => 
  calculatePressure(allRounds, megaRounds),
  [allRounds, megaRounds]
);
```

### Fullscreen Mode
For comprehensive analysis, use fullscreen mode:
```typescript
const [fullscreen, setFullscreen] = useState(false);

const megaRoundsQuery = useMegaRounds(source, megaRange, fullscreen);
// When fullscreen=true, fetches up to 100,000 rounds
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
- Optimize database queries for large datasets

## Future Enhancements

### Planned Features
1. **Machine Learning Integration**: Enhanced prediction accuracy using ML models
2. **Real-time WebSocket**: True real-time pressure updates
3. **Custom Strategies**: User-defined chase strategies
4. **Portfolio Integration**: Track actual trades vs predictions
5. **Alert System**: Notifications when pressure reaches critical levels
6. **Historical Pattern Database**: Store and analyze historical patterns
7. **Multi-Source Analysis**: Compare pressure across multiple sources
8. **Advanced Backtesting**: A/B test different strategies

### Extension Points
- Custom pressure calculation algorithms
- Custom risk levels
- Custom chase strategies
- Custom confidence intervals
- Custom prediction methods

## Support and Resources

### Documentation
- Platform Overview: `/docs/PLATFORM_OVERVIEW.md`
- Mega Pressure Tracker README: `/invent/mega-pressure-tracker/README.md`
- API Documentation: Available via Swagger UI at `/docs`

### Code Locations
- Middleware: `/web/src/lib/invent-middleware/megaPressure.ts`
- Invent Middleware: `/invent/middleware/megaPressure.ts`
- Main UI: `/web/src/pages/dashboard/MegaPressureTracker.tsx`
- Invent UI: `/invent/mega-pressure-tracker/MegaPressureTracker.tsx`

### Platform Integration
- API Client: `/web/src/lib/api.ts`
- Data Ingester: `/web/src/lib/invent-middleware/dataIngester.ts`
- Types: `/web/src/lib/types.ts`
- Format Utilities: `/web/src/lib/format.ts`

## Conclusion

Mega Pressure Tracker provides traders with sophisticated analytics for predicting and analyzing mega events in crash games. The strict middleware pattern ensures clean separation from the main system while providing access to all platform features. The component-based architecture allows for easy extension and customization, making it an ideal foundation for advanced crash game analytics applications.

The implementation includes ETA forecasting, range prediction, bankroll calculation, and chase strategy generation, all with confidence intervals and historical validation. This provides traders with the tools they need to make informed decisions about when and how to chase mega events.
