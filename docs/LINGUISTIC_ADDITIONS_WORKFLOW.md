# Linguistic Additions Workflow

This document outlines the standardized workflow for adding new linguistic patterns to the Momento Core system.

## Overview

Linguistic patterns are semantic abstractions that transform raw multipliers into meaningful market behavior descriptors. This workflow ensures all new patterns are researched, validated, and integrated systematically.

## Phase 1: Research & Definition

### 1.1 Pattern Definition
Define the pattern with clear specifications:
- **Pattern Name**: Descriptive name (e.g., "Ladder", "Ceiling", "Compression")
- **Pattern Types**: Variations (e.g., ascend/collapse for ladders)
- **Detection Rules**: Mathematical/logical criteria
- **Parameters**: Configurable thresholds with defaults
- **Purpose**: What market behavior this pattern represents

### 1.2 Mathematical Foundation
Document the mathematical basis:
- **Formulas**: All calculations with variable definitions
- **Assumptions**: Statistical assumptions made
- **Expected Behavior**: How the pattern should behave
- **Failure Modes**: Conditions where pattern may fail
- **Sensitivity Analysis**: How parameter changes affect results

### 1.3 Literature Review
Research existing approaches:
- Academic papers on similar patterns
- Industrial implementations
- Statistical methods used
- Validation approaches in literature

## Phase 2: Implementation

### 2.1 Core Implementation
Add pattern detection to `backend/momento/linguistics.py`:

```python
@dataclass
class Pattern:
    """Pattern data structure."""
    pattern_type: str
    start_index: int
    end_index: int
    length: int
    # Add pattern-specific fields

def detect_pattern(
    multipliers: Sequence[float],
    min_length: int = 4,
    # Add pattern-specific parameters
) -> List[Pattern]:
    """Detect pattern in multiplier sequence."""
    # Implementation
    pass
```

### 2.2 Pattern Metrics
Implement supporting metrics:
- Distance calculations (if applicable)
- Distribution statistics
- Pressure/scoring functions
- Energy calculations (if applicable)

### 2.3 Analysis Integration
Add pattern analysis to `backend/momento/analysis.py`:
- Pattern-to-outcome correlation
- Enhanced DNA integration (if applicable)
- Release condition detection (if applicable)

### 2.4 Backtest Suite
Add pattern validation to `backend/momento/backtest.py`:
```python
def backtest_pattern(
    rounds: List[Dict[str, Any]],
    settings: AnalysisSettings
) -> Dict[str, Any]:
    """Backtest pattern effectiveness."""
    # Implementation
    pass
```

### 2.5 Forecast Integration
Add pattern to forecast flow in `backend/momento/forecast.py`:
- Selective integration (only if statistically significant)
- Probability adjustments
- ETA modifications (if applicable)

## Phase 3: Testing

### 3.1 Unit Tests
Create `backend/tests/test_pattern_detection.py`:
- Test pattern detection with synthetic data
- Test edge cases
- Test parameter variations

### 3.2 Integration Tests
Create `backend/tests/test_pattern_integration.py`:
- Test with real historical data
- Test integration with analysis pipeline
- Test forecast integration

### 3.3 Accuracy Tests
Create `backend/tests/test_pattern_accuracy.py`:
- Compare vs baseline predictions
- Calculate improvement metrics
- Statistical significance testing

### 3.4 Test Execution
```bash
cd /home/pirates/Avfs_Core/avfs/v4/backend
.venv/bin/python tests/test_pattern_detection.py
.venv/bin/python tests/test_pattern_integration.py
.venv/bin/python tests/test_pattern_accuracy.py
```

## Phase 4: Validation

### 4.1 Performance Metrics
Calculate key metrics:
- **Pattern Accuracy**: How often pattern predicts correctly
- **Moonshot Correlation**: Pattern-to-moonshot correlation rate
- **False Positive Rate**: Incorrect pattern predictions
- **Time-to-Outcome**: Average rounds to predicted outcome
- **Confidence Intervals**: Statistical confidence in predictions

### 4.2 Statistical Validation
- Compare against baseline (simple statistical prediction)
- Require >5% improvement for general integration
- Require >10% improvement for selective integration
- Calculate statistical significance

### 4.3 Integration Decision
Based on validation results:
- **Significant Improvement (>10%)**: Full integration
- **Moderate Improvement (5-10%)**: Selective integration
- **No Improvement (<5%)**: Do not integrate

## Phase 5: Documentation

### 5.1 Code Documentation
- Docstrings for all functions
- Parameter descriptions
- Return value documentation
- Usage examples

### 5.2 API Documentation
Update API docs if pattern exposed via API:
- Endpoint documentation
- Response schemas
- Example requests/responses

### 5.3 Developer Documentation
Update relevant docs:
- `docs/developer/ADDING_FUNCTIONS.md`
- `docs/FEATURES.md`
- Pattern-specific documentation if complex

## Phase 6: AI Config Update

### 6.1 Feature Engineering
Update `invent/ai_config.json`:
```json
"stage_2_feature_engineering": {
  "identify": [
    // Add new pattern features
    "New pattern (type1/type2)",
    "Pattern metric 1",
    "Pattern metric 2"
  ]
}
```

### 6.2 Feature Exposure
Update feature exposure requirements:
```json
"every_feature_must_expose": [
  // Add pattern-specific metrics
  "Pattern correlation metrics",
  "Pattern prediction metrics"
]
```

## Example: Ladder Pattern Implementation

### Pattern Definition
- **Name**: Ladder
- **Types**: Ascend, Collapse
- **Detection**: Consecutive rounds >= base (ascend) or <= base (collapse)
- **Min Length**: 4 rounds
- **Purpose**: Detect sustained directional movement

### Implementation Files
- `backend/momento/linguistics.py`: Core detection
- `backend/momento/analysis.py`: DNA integration, release conditions
- `backend/momento/backtest.py`: Backtest suite
- `backend/momento/forecast.py`: Selective moonshot integration

### Test Results
- Ladder-to-moonshot correlation: 52.31%
- Longest ladder moonshot rate: 80.0%
- General accuracy: 22% vs 20% baseline (+2%)
- **Decision**: Selective integration for moonshot prediction only

### Integration Strategy
- Applied ladder moonshot probability tilt in forecast
- Only integrated for moonshot state (not general predictions)
- Threshold: moonshot_probability > 0.6 triggers tilt

## Checklist

Before considering a pattern addition complete:

- [ ] Pattern defined with clear specifications
- [ ] Mathematical foundation documented
- [ ] Core implementation in linguistics.py
- [ ] Supporting metrics implemented
- [ ] Analysis integration complete
- [ ] Backtest suite implemented
- [ ] Forecast integration (if validated)
- [ ] Unit tests created and passing
- [ ] Integration tests created and passing
- [ ] Accuracy tests completed
- [ ] Performance metrics calculated
- [ ] Statistical validation performed
- [ ] Integration decision made
- [ ] Code documentation complete
- [ ] AI config updated
- [ ] Developer docs updated

## Best Practices

1. **Research First**: Never implement without mathematical foundation
2. **Test Thoroughly**: Unit, integration, and accuracy tests required
3. **Validate Statistically**: Compare against baseline, require significance
4. **Document Everything**: Code, API, and developer documentation
5. **Selective Integration**: Only integrate if statistically significant
6. **Open Architecture**: Design for future pattern additions
7. **Configurable Parameters**: Make thresholds configurable
8. **Backtest-First**: Validate before production integration

## Common Patterns

### Pattern Types
- **Sequential**: Ladder, streak, consecutive patterns
- **Resistance**: Ceiling, floor, support levels
- **Compression**: Energy, pressure, gap analysis
- **Distribution**: Frequency, clustering, distance metrics
- **Release**: Moonshot precursors, breakout conditions

### Common Metrics
- Length/duration
- Slope/rate of change
- Strength/purity scores
- Distance between patterns
- Distribution statistics
- Correlation with outcomes
- Probability adjustments

## Troubleshooting

### Pattern Not Detected
- Check parameter thresholds
- Verify data quality
- Test with synthetic data
- Review detection logic

### Poor Accuracy
- Review mathematical foundation
- Check for overfitting
- Validate with different time periods
- Consider parameter tuning

### Integration Issues
- Verify forecast integration logic
- Check probability adjustments
- Test with real data
- Review statistical significance

## References

- `backend/momento/linguistics.py` - Core linguistic layer
- `backend/momento/analysis.py` - Analysis engine
- `backend/momento/backtest.py` - Backtest framework
- `backend/momento/forecast.py` - Forecast engine
- `invent/ai_config.json` - AI configuration
- `docs/developer/ADDING_FUNCTIONS.md` - Developer guide
