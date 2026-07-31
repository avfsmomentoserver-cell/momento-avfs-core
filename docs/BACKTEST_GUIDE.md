# Backtesting Guide

This guide explains how to use the enhanced backtesting framework to validate features and optimize configurations.

## Overview

The backtesting framework allows you to:
- Run historical backtests on your data
- Test features in isolation or combination
- Use phased testing (warmup, normal, stress)
- Compute advanced accuracy metrics
- Perform A/B testing between configurations
- Get AI-assisted configuration suggestions

## Basic Backtest

Run a simple backtest:

```python
from momento.backtest import run_backtest
from momento import store

# Get rounds
rounds = store.history("aviator", 10000, ingest_method="file")

# Run backtest
result = run_backtest(
    source="aviator",
    config_dict={
        "session_gap": 300,
        "window_size": 5000,
        "min_session_rounds": 10
    }
)

print(f"Baseline accuracy: {result['baseline_accuracy']}")
print(f"Sessions tested: {result['total_sessions']}")
```

## Phased Backtesting

Split data into intelligent test phases:

```python
from momento.backtest import split_test_phases, run_backtest

# Get rounds
rounds = store.history("aviator", 10000, ingest_method="file")

# Split into phases
phases = split_test_phases(rounds, warmup_pct=0.1, stress_pct=0.3)

# Test each phase
for phase_name, phase_rounds in phases.items():
    result = run_backtest("aviator", {"session_gap": 300}, rounds=phase_rounds)
    print(f"{phase_name} accuracy: {result['baseline_accuracy']}")
```

## Advanced Metrics

Compute comprehensive accuracy metrics:

```python
from momento.backtest import compute_advanced_metrics

# After running predictions
metrics = compute_advanced_metrics(predictions, actuals)

print(f"Precision: {metrics['precision']}")
print(f"Recall: {metrics['recall']}")
print(f"F1 Score: {metrics['f1_score']}")
print(f"MAE: {metrics['mae']}")
print(f"RMSE: {metrics['rmse']}")
```

## A/B Testing

Compare two configurations:

```python
from momento.backtest import ab_test_feature

rounds = store.history("aviator", 10000, ingest_method="file")

result = ab_test_feature(
    rounds=rounds,
    feature_name="pressure",
    config_a={"session_gap": 300, "window_size": 5000},
    config_b={"session_gap": 600, "window_size": 10000}
)

print(f"Config A accuracy: {result['config_a_accuracy']}")
print(f"Config B accuracy: {result['config_b_accuracy']}")
print(f"Winner: {result['winner']}")
print(f"Significance: {result['significance']}")
```

## AI-Assisted Optimization

Use AI to suggest optimal configurations:

```python
from features.ai.optimizer import BacktestOptimizer

optimizer = BacktestOptimizer()

# Add historical backtest results
for result in historical_results:
    optimizer.add_result(result)

# Get suggestions
gap_suggestion = optimizer.suggest_session_gap()
print(f"Suggested session gap: {gap_suggestion['suggested_gap']}")
print(f"Confidence: {gap_suggestion['confidence']}")

window_suggestion = optimizer.suggest_window_size()
print(f"Suggested window size: {window_suggestion['suggested_window']}")

# Get complete configuration
config = optimizer.suggest_backtest_config(
    historical_results=historical_results,
    objective="maximize_accuracy",
    constraints={"max_runtime": 300}
)

print(f"Optimal config: {config}")
```

## Feature Testing

Test specific features:

```python
from features.pressure.detector import CeilingDetector
from features.pressure.calculator import PressureCalculator

# Get rounds
rounds = store.history("aviator", 1000, ingest_method="file")

# Test pressure plugin
detector = CeilingDetector()
ceilings = detector.detect_resistance_ceilings(rounds)

calculator = PressureCalculator()
pressure_data = calculator.compute_pressure(rounds, ceilings)

print(f"Pressure: {pressure_data['pressure_percent']}%")
print(f"Release probability: {pressure_data['release_probability']}")
```

## Pattern Learning

Learn patterns from historical data:

```python
from features.ai.pattern_learner import MoonshotPatternLearner

learner = MoonshotPatternLearner()

# Extract features
features = learner.extract_features(rounds, window=20)

# Learn patterns
patterns = learner.learn_patterns(features)

print(f"Pattern accuracy: {patterns['accuracy']}")
print(f"Feature importance: {patterns['feature_importance']}")

# Predict on current data
current_features = learner._compute_window_features(rounds[-20:])
prediction = learner.predict_moonshot(current_features, patterns["patterns"])

print(f"Moonshot probability: {prediction['probability']}")
```

## Best Practices

1. **Use file-based data**: Always use `ingest_method="file"` for consistent results
2. **Test on sufficient data**: Use at least 10,000 rounds for meaningful results
3. **Validate with phases**: Use phased testing to ensure robustness
4. **Compare baselines**: Always compare against a baseline configuration
5. **Use A/B testing**: Validate changes with statistical significance
6. **Iterate with AI**: Use AI suggestions to optimize configurations
7. **Track results**: Store backtest results for continuous improvement

## Configuration Reference

### Backtest Configuration

```python
config = {
    "session_gap": 300,              # Seconds between sessions
    "window_size": 5000,             # Analysis window size
    "min_session_rounds": 10,        # Minimum rounds per session
    "max_rounds": 10000,             # Maximum rounds to test
    "ingest_method": "file",         # Data source
    "feature_toggles": {             # Feature toggles
        "pressure": True,
        "moonshot_scanner": True
    }
}
```

### Feature Configuration

```python
from features.config import FeatureConfig

config = FeatureConfig()

# Pressure settings
config.pressure_min_touches = 3
config.pressure_tolerance = 0.05

# Moonshot settings
config.moonshot_lookback = 100
config.moonshot_confidence_threshold = 0.7

# Backtest settings
config.backtest_warmup_pct = 0.1
config.backtest_stress_pct = 0.3
```

## Troubleshooting

### Low Accuracy

- Increase window size for more context
- Adjust session gap for better session segmentation
- Enable more features for richer analysis
- Check data quality and consistency

### No Sessions Detected

- Decrease session gap threshold
- Check for gaps in timestamp data
- Verify data source is correct

### Slow Performance

- Reduce max_rounds for testing
- Use phased testing to limit data size
- Optimize database queries with indexes
- Consider sampling for initial tests
