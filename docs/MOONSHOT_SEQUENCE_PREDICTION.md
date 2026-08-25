# Moonshot Sequence Prediction

## Overview

The Moonshot Sequence Prediction system adds prediction capabilities based on moonshot sequences deduced by filtering rounds in sessions, scaled to ensure comprehensive coverage of all moonshots in sequence.

## Key Features

### 1. Session-Based Filtering
- Splits historical rounds into sessions based on time gaps
- Filters rounds within each session to identify moonshot events
- Uses configurable threshold scaling for comprehensive coverage

### 2. Sequence Deduction
- Analyzes moonshot patterns within sessions
- Calculates sequence growth rates, acceleration, and volatility
- Tracks time spans and rounds between moonshot events
- Identifies peak multipliers and average session characteristics

### 3. Prediction Logic
- Finds similar historical sequences based on session characteristics
- Aggregates predictions from multiple similar sequences
- Estimates next moonshot multiplier and timing
- Provides confidence scores based on similarity and data quality

### 4. 10x+ Scaling
- Default threshold of 10x ensures all significant moonshots are captured
- Configurable scale factor allows adjustment of filtering comprehensiveness
- Extended threshold guarantees comprehensive moonshot coverage
- Scale factor of 1.0 = 10x threshold, lower values = more comprehensive

## Implementation

### Core Module: `moonshot_sequence_predictor.py`

Main class: `MoonshotSequencePredictor`

Key methods:
- `filter_moonshot_rounds()` - Filters rounds to identify moonshot events
- `deduce_moonshot_sequences()` - Deduces sequences from session data
- `predict_next_moonshot()` - Generates predictions based on historical patterns
- `analyze_moonshot_sequences()` - Complete analysis pipeline

### Integration Points

1. **Analysis Engine** (`analysis.py`)
   - Integrated into main analysis payload
   - Automatically runs when sufficient data is available
   - Results included in `moonshot_sequence_analysis` field

2. **API Routes** (`api/routes/analysis.py`)
   - New endpoint: `/analysis/moonshot-sequence`
   - Supports custom scale factor parameter
   - Returns complete sequence analysis and predictions

## Usage

### API Endpoint

```bash
GET /api/analysis/moonshot-sequence?source={source}&scale_factor=1.0
```

Parameters:
- `source`: Data source to analyze
- `scale_factor`: Threshold multiplier (default 1.0 = 10x, 0.5 = 5x)
- `ingest_method`: Optional filter for data ingestion method

### Response Structure

```json
{
  "status": "success",
  "sessions_count": 3,
  "sequences_found": 2,
  "total_moonshots": 15,
  "avg_moonshots_per_session": 7.5,
  "peak_multiplier": 50.0,
  "sequences": [
    {
      "session_index": 0,
      "moonshot_count": 8,
      "multipliers": [12.0, 15.0, 25.0, ...],
      "peak_multiplier": 50.0,
      "avg_multiplier": 22.5,
      "sequence_growth": {
        "growth_rate": 0.35,
        "acceleration": 0.05,
        "volatility": 0.15
      },
      "time_span": {
        "duration_seconds": 450.0,
        "avg_seconds_between": 64.3
      },
      "rounds_between_moonshots": [5, 8, 6, ...]
    }
  ],
  "prediction": {
    "predicted": true,
    "confidence": 0.75,
    "predicted_multiplier": 28.5,
    "estimated_rounds_until": 7,
    "similar_sequences_count": 3,
    "weighted_growth_rate": 0.32
  },
  "filtering_threshold": 10.0,
  "scale_factor": 1.0
}
```

## Configuration

### Analysis Settings

The system uses existing `AnalysisSettings` from `config.py`:

- `moonshot_threshold`: Base threshold (default 10.0)
- `session_gap_seconds`: Time gap for session splitting (default 300)

### Scale Factor Interpretation

- `1.0`: Base threshold (10x) - standard moonshot detection
- `0.5`: 5x threshold - more comprehensive, includes lower multipliers
- `0.1`: 1x threshold - maximum comprehensiveness
- Higher values: Less comprehensive, only very high multipliers

## Testing

### Unit Tests

Located in `backend/tests/test_moonshot_sequence_predictor.py`:

- `test_filter_moonshot_rounds()` - Tests filtering functionality
- `test_deduce_moonshot_sequences()` - Tests sequence deduction
- `test_predict_next_moonshot()` - Tests prediction generation
- `test_analyze_moonshot_sequences_integration()` - Tests full pipeline
- `test_scaling_factor()` - Tests threshold scaling
- `test_sequence_growth_calculation()` - Tests growth calculations
- `test_empty_data_handling()` - Tests edge cases

### Running Tests

```bash
cd backend
python3 -m pytest tests/test_moonshot_sequence_predictor.py -v
```

## Algorithm Details

### Sequence Similarity

Similarity between sequences is calculated based on:
1. Average multiplier difference (60% weight)
2. Peak multiplier difference (40% weight)

Similarity score ranges from 0 to 1, where lower values indicate higher similarity.

### Prediction Aggregation

Predictions are aggregated from similar sequences using:
- Weighted average based on similarity scores
- Growth rate extrapolation from historical patterns
- Confidence calculation combining similarity and sequence count

### Growth Calculation

Sequence growth metrics:
- **Growth Rate**: Average percentage change between consecutive moonshots
- **Acceleration**: Change in growth rate over time
- **Volatility**: Standard deviation of growth rates

## Performance Considerations

- Session splitting is O(n) where n is number of rounds
- Sequence deduction is O(m) where m is number of sessions
- Prediction is O(k) where k is number of similar sequences (typically < 10)
- Memory usage scales with number of moonshot events, not total rounds

## Future Enhancements

Potential improvements:
1. Machine learning for pattern recognition
2. Real-time sequence updates
3. Multi-source sequence correlation
4. Advanced confidence modeling
5. Sequence clustering and classification
6. Cross-session pattern analysis

## Troubleshooting

### No Sequences Found

If `sequences_found` is 0:
- Check if data contains moonshots (≥10x multipliers)
- Verify session gap settings are appropriate
- Try lowering the scale factor for more comprehensive filtering
- Ensure sufficient historical data (20+ rounds recommended)

### Low Confidence Predictions

If prediction confidence is low:
- Increase historical data volume
- Check session quality and consistency
- Verify moonshot threshold is appropriate
- Consider adjusting similarity thresholds

### Integration Issues

If the feature isn't appearing in analysis:
- Check that `MOONSHOT_SEQUENCE_PREDICTOR_AVAILABLE` is True
- Verify imports are successful in `analysis.py`
- Ensure sufficient rounds (≥20) for analysis
- Check logs for import or runtime errors