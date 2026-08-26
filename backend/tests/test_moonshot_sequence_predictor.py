"""Test moonshot sequence predictor functionality."""

import pytest
from datetime import datetime, timedelta
from momento.moonshot_sequence_predictor import MoonshotSequencePredictor, analyze_moonshot_sequences
from momento.config import AnalysisSettings


def create_test_rounds(multipliers, base_time=None):
    """Create test rounds with given multipliers."""
    if base_time is None:
        base_time = datetime.utcnow()
    
    rounds = []
    for i, mult in enumerate(multipliers):
        rounds.append({
            "id": f"test_{i}",
            "multiplier": mult,
            "timestamp": (base_time + timedelta(seconds=i*30)).isoformat() + "Z",
            "band": "high" if mult >= 5.0 else "low",
            "points": mult * 100
        })
    return rounds


def test_filter_moonshot_rounds():
    """Test filtering rounds for moonshot events."""
    settings = AnalysisSettings()
    predictor = MoonshotSequencePredictor(settings)
    
    # Create test data with mixed multipliers
    multipliers = [1.0, 2.0, 5.0, 12.0, 3.0, 15.0, 2.0, 25.0, 1.0]
    rounds = create_test_rounds(multipliers)
    
    # Filter with default threshold (10x)
    moonshot_rounds = predictor.filter_moonshot_rounds(rounds)
    
    # Should capture 12x, 15x, 25x
    assert len(moonshot_rounds) == 3
    assert all(r["multiplier"] >= 10.0 for r in moonshot_rounds)
    
    # Filter with custom threshold (20x)
    moonshot_rounds_20x = predictor.filter_moonshot_rounds(rounds, threshold=20.0)
    assert len(moonshot_rounds_20x) == 1  # Only 25x
    assert moonshot_rounds_20x[0]["multiplier"] == 25.0


def test_deduce_moonshot_sequences():
    """Test deducing moonshot sequences from sessions."""
    settings = AnalysisSettings()
    predictor = MoonshotSequencePredictor(settings)
    
    # Create multiple sessions with moonshot patterns
    session1 = create_test_rounds([1.0, 2.0, 12.0, 3.0, 15.0, 2.0, 25.0])
    session2 = create_test_rounds([1.0, 5.0, 10.0, 2.0, 18.0])
    session3 = create_test_rounds([1.0, 2.0, 3.0, 4.0])  # No moonshots
    
    sessions = [session1, session2, session3]
    
    # Deduce sequences with the 1.0 reference scale (10x threshold floor)
    sequences = predictor.deduce_moonshot_sequences(sessions, scale_factor=1.0)
    
    # Should find sequences in session1 and session2, but not session3
    assert len(sequences) == 2
    
    # Check session1 sequence (3 moonshots)
    seq1 = sequences[0]
    assert seq1["moonshot_count"] == 3
    assert seq1["peak_multiplier"] == 25.0
    assert seq1["scale_factor"] == 1.0
    # The 10x reference threshold selects only moonshots at >= 10x.
    assert seq1["threshold_used"] >= 10.0
    assert all(m >= 10.0 for m in seq1["multipliers"])
    
    # Check session2 sequence (2 moonshots)
    seq2 = sequences[1]
    assert seq2["moonshot_count"] == 2
    assert seq2["peak_multiplier"] == 18.0


def test_predict_next_moonshot():
    """Test predicting next moonshot based on sequences."""
    settings = AnalysisSettings()
    predictor = MoonshotSequencePredictor(settings)
    
    # Create historical sequences with strong growth patterns.
    # The bias calculation uses log-ratio growth with sigmoid transform,
    # so we need high growth rates to push bias_score > 0.5.
    historical_sequences = [
        {
            "session_index": 0,
            "moonshot_count": 3,
            "multipliers": [10.0, 20.0, 40.0],  # log growth: log(2)=0.69, log(2)=0.69
            "avg_multiplier": 23.33,
            "peak_multiplier": 40.0,
            "sequence_growth": {"growth_rate": 1.0, "acceleration": 0.0, "volatility": 0.0},
            "rounds_between_moonshots": [5, 8],
            "similarity_score": 0.2
        },
        {
            "session_index": 1,
            "moonshot_count": 2,
            "multipliers": [10.0, 30.0],  # log growth: log(3)=1.10
            "avg_multiplier": 20.0,
            "peak_multiplier": 30.0,
            "sequence_growth": {"growth_rate": 2.0, "acceleration": 0.0, "volatility": 0.0},
            "rounds_between_moonshots": [6],
            "similarity_score": 0.3
        }
    ]
    
    # Create current session with moderate activity
    current_session = create_test_rounds([1.0, 2.0, 5.0, 11.0, 3.0])
    
    # Generate prediction
    prediction = predictor.predict_next_moonshot(historical_sequences, current_session)
    
    # Check prediction structure
    assert prediction["predicted"] == True
    assert prediction["confidence"] > 0.0
    # The predicted multiplier is derived from the historical sequence peaks,
    # not floored at 10x — it must sit within the observed peak distribution.
    peak_values = [s["peak_multiplier"] for s in historical_sequences]
    assert min(peak_values) <= prediction["predicted_multiplier"] <= max(peak_values)
    assert prediction["predicted_range"]["lo"] <= prediction["predicted_range"]["hi"]
    assert prediction["predicted_range"]["lo"] >= 1.0
    assert "basis" in prediction
    assert "historical_target" in prediction
    # Removed keys must no longer be present.
    assert "estimated_rounds_until" not in prediction
    assert "similar_sequences_count" not in prediction
    
    # Variance guard: a different peak distribution must produce a different
    # predicted multiplier (prediction is data-driven, not a constant floor).
    offset_sequences = [
        dict(seq, peak_multiplier=peak, avg_multiplier=peak)
        for seq, peak in zip(historical_sequences, [12.0, 13.0])
    ]
    offset_prediction = predictor.predict_next_moonshot(offset_sequences, current_session)
    assert offset_prediction["predicted"] == True
    assert offset_prediction["predicted_multiplier"] != prediction["predicted_multiplier"]


def test_analyze_moonshot_sequences_integration():
    """Test the full integration of moonshot sequence analysis."""
    settings = AnalysisSettings()
    
    # Create test data with multiple sessions
    base_time = datetime.utcnow()
    
    # Session 1: Multiple moonshots
    session1_rounds = []
    for i in range(20):
        mult = 1.0 + i * 0.5
        if i in [5, 10, 15]:  # Add moonshots at specific points
            mult = 10.0 + i * 2
        session1_rounds.append({
            "id": f"s1_{i}",
            "multiplier": mult,
            "timestamp": (base_time + timedelta(seconds=i*30)).isoformat() + "Z",
            "band": "high" if mult >= 5.0 else "low"
        })
    
    # Session 2: Different pattern (separated by > gap_seconds to form a session)
    session2_rounds = []
    for i in range(15):
        mult = 1.0 + i * 0.3
        if i in [7, 12]:  # Moonshots
            mult = 12.0 + i * 1.5
        session2_rounds.append({
            "id": f"s2_{i}",
            "multiplier": mult,
            "timestamp": (base_time + timedelta(seconds=3600 + i*30)).isoformat() + "Z",  # Large gap for new session
            "band": "high" if mult >= 5.0 else "low"
        })
    
    all_rounds = session1_rounds + session2_rounds
    
    # Run analysis
    result = analyze_moonshot_sequences(all_rounds, settings, gap_seconds=300)
    
    # Check result structure
    assert result["status"] == "success"
    assert result["sessions_count"] == 2
    assert result["sequences_found"] >= 1
    assert "total_moonshots" in result
    assert "peak_multiplier" in result
    assert "sequences" in result
    assert "prediction" in result
    assert "filtering_threshold" in result
    assert result["scale_factor"] == 1.0
    assert result["filtering_threshold"] >= 10.0


def test_scaling_factor():
    """Test scaling factor semantics against the 10x filter floor."""
    settings = AnalysisSettings()
    predictor = MoonshotSequencePredictor(settings)
    
    # The reference threshold for filtering moonshots is floored at 10x,
    # regardless of the configured base threshold.
    assert predictor.extended_threshold == max(10.0, settings.moonshot_threshold)
    
    multipliers = [1.0, 5.0, 8.0, 12.0, 15.0, 20.0, 25.0]
    rounds = create_test_rounds(multipliers)
    
    # Default filtering uses the 10x reference floor.
    filtered = predictor.filter_moonshot_rounds(rounds)
    assert [r["multiplier"] for r in filtered] == [12.0, 15.0, 20.0, 25.0]
    assert all(r["multiplier"] >= 10.0 for r in filtered)
    
    # scale_factor=1.0 keeps the 10x threshold for session-based deduction.
    seq_10x = predictor.deduce_moonshot_sequences([rounds], scale_factor=1.0)
    assert len(seq_10x) == 1
    assert seq_10x[0]["threshold_used"] >= 10.0
    assert all(m >= 10.0 for m in seq_10x[0]["multipliers"])
    
    # Lowering the scale factor must NOT lower the filter floor below 10x:
    # scaled threshold = max(base_threshold * 0.5, 10.0) = 10.0.
    seq_05x = predictor.deduce_moonshot_sequences([rounds], scale_factor=0.5)
    assert len(seq_05x) == 1
    assert seq_05x[0]["threshold_used"] >= 10.0
    assert seq_05x[0]["multipliers"] == seq_10x[0]["multipliers"]


def test_sequence_growth_calculation():
    """Test sequence growth calculations."""
    settings = AnalysisSettings()
    predictor = MoonshotSequencePredictor(settings)
    
    multipliers = [10.0, 15.0, 25.0, 40.0]
    growth = predictor._calculate_sequence_growth(multipliers)
    
    assert "growth_rate" in growth
    assert "acceleration" in growth
    assert "volatility" in growth
    assert growth["growth_rate"] > 0  # Should be positive growth


def test_empty_data_handling():
    """Test handling of empty or insufficient data."""
    settings = AnalysisSettings()
    predictor = MoonshotSequencePredictor(settings)
    
    # Empty rounds
    empty_result = predictor.filter_moonshot_rounds([])
    assert len(empty_result) == 0
    
    # Empty sessions
    empty_sequences = predictor.deduce_moonshot_sequences([])
    assert len(empty_sequences) == 0
    
    # Prediction with no sequences
    no_seq_prediction = predictor.predict_next_moonshot([], [])
    assert no_seq_prediction["predicted"] == False
    assert "reason" in no_seq_prediction


if __name__ == "__main__":
    pytest.main([__file__, "-v"])