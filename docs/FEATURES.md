# Feature Documentation

This document describes how to use the advanced analysis features in Momento v4.

## Feature Framework

### Base Feature Interface

All features implement the `BaseFeature` interface:

```python
from features.base import BaseFeature

class MyFeature(BaseFeature):
    def compute(self, rounds, settings):
        # Compute metrics
        return {"metric": value}
    
    def backtest(self, rounds, config):
        # Run backtest validation
        return {"accuracy": 0.85}
    
    def get_metrics(self):
        return ["metric"]
    
    def get_name(self):
        return "my_feature"
    
    def get_description(self):
        return "Description of my feature"
```

### Feature Registry

Register and manage features:

```python
from features import registry

# Register a feature
registry.register("my_feature", MyFeature)

# Get a feature instance
feature = registry.get("my_feature")

# Enable/disable features
registry.enable("my_feature")
registry.disable("my_feature")

# List features
features = registry.list_features()
enabled = registry.get_enabled_features()
```

## Pressure Plugin

### Ceiling Detection

Detect resistance ceilings from historical data:

```python
from features.pressure.detector import CeilingDetector

detector = CeilingDetector(min_touches=3, tolerance=0.05)
ceilings = detector.detect_resistance_ceilings(rounds)

# Returns list of ceiling dictionaries:
# {
#     "level": 3.45,
#     "archetype": "ascending",
#     "touches": 7,
#     "first_touch_index": 10,
#     "last_touch_index": 150
# }
```

### Pressure Calculation

Compute pressure stored under ceilings:

```python
from features.pressure.calculator import PressureCalculator

calculator = PressureCalculator()
pressure_data = calculator.compute_pressure(rounds, ceilings)

# Returns:
# {
#     "pressure_percent": 87.5,
#     "pressure_by_ceiling": [...],
#     "dominant_ceiling": {...},
#     "release_probability": 0.78,
#     "imminent_ranges": [[3.40, 3.50]]
# }
```

### Pressure Gauge

Format pressure for display:

```python
from features.pressure.metrics import PressureMetrics

metrics = PressureMetrics()
gauge_output = metrics.format_pressure_gauge(pressure_data)
status = metrics.get_pressure_status(pressure_data["pressure_percent"])
```

## Equal Baseline Chart

### Multiplier Conversion

Convert multipliers to equal baseline scale:

```python
from features.equal_baseline.converter import MultiplierConverter

converter = MultiplierConverter(min_mult=1.0, max_mult=50.0)

# Single conversion
baseline = converter.convert_multiplier_to_baseline(3.5)  # Returns -42.3

# Batch conversion
baselines = converter.convert_multipliers_to_baseline([1.5, 3.5, 10.0])

# Reverse conversion
multiplier = converter.baseline_to_multiplier(-42.3)
```

### Trendline Computation

Compute trendlines for momentum analysis:

```python
from features.equal_baseline.trendlines import TrendlineComputer

computer = TrendlineComputer(window=20)
trendlines = computer.compute_trendlines(baseline_values)

# Returns:
# {
#     "short_trend": [...],
#     "long_trend": [...],
#     "momentum": [...]
# }

# Detect momentum shifts
shifts = computer.detect_momentum_shifts(trendlines["momentum"], threshold=5.0)
```

## Moonshot Scanner

### Linguistics

Compute linguistic factors for moonshot prediction:

```python
from features.moonshot_scanner.linguistics import MoonshotLinguistics

linguistics = MoonshotLinguistics()

# Compute all factors
factors = linguistics.compute_all_linguistics(rounds, pressure_data, ceilings)

# Returns:
# {
#     "pressure": 0.875,
#     "momentum_distance_20x": {"distance": 15, "metric": "rounds", "found": True},
#     "momentum_distance_10x": {"distance": 5, "metric": "rounds", "found": True},
#     "ceiling_proximity": 0.65,
#     "band_transition": {...},
#     "compression": 0.72
# }
```

### Moonshot Scanning

Scan for moonshot conditions:

```python
from features.moonshot_scanner.scanner import MoonshotScanner

scanner = MoonshotScanner(lookback=100)
result = scanner.scan_moonshot_conditions(rounds, linguistics)

# Returns:
# {
#     "imminent": True,
#     "confidence": 0.82,
#     "factors": {...},
#     "patterns": {...},
#     "historical_moonshots": 45
# }
```

## Band Analysis

### Ladder Detection

Detect ladder collapse sequences:

```python
from features.band_analysis.ladders import LadderDetector

detector = LadderDetector(min_length=3)

# Single band
result = detector.detect_ladder_sequences(rounds, (2.0, 3.0))

# All bands
all_bands = detector.analyze_all_bands(rounds)

# Returns for each band:
# {
#     "sequences": [...],
#     "collapse_points": [...],
#     "avg_ladder_length": 4.5,
#     "collapse_frequency": 0.023,
#     "total_sequences": 12
# }
```

### Band Relativity

Compute band relationships:

```python
from features.band_analysis.relativity import BandRelativity

relativity = BandRelativity()
results = relativity.compute_band_relativity(rounds)

# Returns:
# {
#     "transition_matrix": {...},
#     "correlation_matrix": {...},
#     "lead_lag": {...},
#     "synchronization": 0.73
# }

# Dynamic band definition
dynamic_bands = relativity.define_dynamic_bands(ceilings, multipliers)
```

## AI Components

### Backtest Optimizer

AI-assisted backtest configuration:

```python
from features.ai.optimizer import BacktestOptimizer

optimizer = BacktestOptimizer()

# Add historical results
optimizer.add_result(backtest_result_1)
optimizer.add_result(backtest_result_2)

# Get suggestions
gap_suggestion = optimizer.suggest_session_gap()
window_suggestion = optimizer.suggest_window_size()
toggles_suggestion = optimizer.suggest_feature_toggles()

# Complete configuration
config = optimizer.suggest_backtest_config(
    historical_results=[...],
    objective="maximize_accuracy",
    constraints={"max_runtime": 300}
)
```

### Pattern Learning

Learn moonshot patterns from historical data:

```python
from features.ai.pattern_learner import MoonshotPatternLearner

learner = MoonshotPatternLearner()

# Extract features
features = learner.extract_features(rounds, window=20)

# Learn patterns
patterns = learner.learn_patterns(features)

# Predict moonshot
prediction = learner.predict_moonshot(current_features, patterns["patterns"])
```

## Backtest Framework

### Phased Backtesting

Split data into test phases:

```python
from momento.backtest import split_test_phases

phases = split_test_phases(rounds, warmup_pct=0.1, stress_pct=0.3)

# Returns:
# {
#     "warmup": [...],  # First 10%
#     "normal": [...],  # Middle 60%
#     "stress": [...]   # Last 30%
# }
```

### Advanced Metrics

Compute comprehensive accuracy metrics:

```python
from momento.backtest import compute_advanced_metrics

metrics = compute_advanced_metrics(predictions, actuals)

# Returns:
# {
#     "precision": 0.85,
#     "recall": 0.78,
#     "f1_score": 0.81,
#     "mae": 0.23,
#     "rmse": 0.45,
#     "accuracy": 0.82
# }
```

### A/B Testing

Compare feature configurations:

```python
from momento.backtest import ab_test_feature

result = ab_test_feature(
    rounds=rounds,
    feature_name="pressure",
    config_a={"session_gap": 300},
    config_b={"session_gap": 600}
)

# Returns:
# {
#     "config_a_accuracy": 0.75,
#     "config_b_accuracy": 0.82,
#     "delta": 0.07,
#     "significance": "medium",
#     "winner": "config_b"
# }
```

## Integration Example

Complete workflow example:

```python
from features.pressure.detector import CeilingDetector
from features.pressure.calculator import PressureCalculator
from features.moonshot_scanner.linguistics import MoonshotLinguistics
from features.moonshot_scanner.scanner import MoonshotScanner

# Get historical rounds
rounds = store.history("aviator", 1000, ingest_method="file")

# Detect ceilings
detector = CeilingDetector()
ceilings = detector.detect_resistance_ceilings(rounds)

# Compute pressure
calculator = PressureCalculator()
pressure_data = calculator.compute_pressure(rounds, ceilings)

# Compute linguistics
linguistics = MoonshotLinguistics()
factors = linguistics.compute_all_linguistics(rounds, pressure_data, ceilings)

# Scan for moonshot conditions
scanner = MoonshotScanner()
moonshot_result = scanner.scan_moonshot_conditions(rounds, factors)

print(f"Moonshot imminent: {moonshot_result['imminent']}")
print(f"Confidence: {moonshot_result['confidence']}")
print(f"Pressure: {pressure_data['pressure_percent']}%")
```
