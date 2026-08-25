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
    
    # Deduce sequences with 10x scaling
    sequences = predictor.deduce_moonshot_sequences(sessions, scale_factor=10.0)
    
    # Should find sequences in session1 and session2, but not session3
    assert len(sequences) == 2
    
    # Check session1 sequence (3 moonshots)
    seq1 = sequences[0]
    assert seq1["moonshot_count"] == 3
    assert seq1["peak_multiplier"] == 25.0
    assert seq1["scale_factor"] == 10.0
    
    # Check session2 sequence (2 moonshots)
    seq2 = sequences[1]
    assert seq2["moonshot_count"] == 2
    assert seq2["peak_multiplier"] == 18.0


def test_predict_next_moonshot():
    """Test predicting next moonshot based on sequences."""
    settings = AnalysisSettings()
    predictor = MoonshotSequencePredictor(settings)
    
    # Create historical sequences
    historical_sequences = [
        {
            "session_index": 0,
            "moonshot_count": 3,
            "multipliers": [12.0, 15.0, 25.0],
            "avg_multiplier": 17.33,
            "peak_multiplier": 25.0,
            "sequence_growth": {"growth_rate": 0.5, "acceleration": 0.1, "volatility": 0.2},
            "rounds_between_moonshots": [5, 8],
            "similarity_score": 0.2
        },
        {
            "session_index": 1,
            "moonshot_count": 2,
            "multipliers": [10.0, 18.0],
            "avg_multiplier": 14.0,
            "peak_multiplier": 18.0,
            "sequence_growth": {"growth_rate": 0.8, "acceleration": 0.0, "volatility": 0.1},
            "rounds_between_moonshots": [6],
            "similarity_score": 0.3
        }
    ]
    
    # Create current session with similar pattern
    current_session = create_test_rounds([1.0, 2.0, 5.0, 11.0, 3.0])
    
    # Generate prediction
    prediction = predictor.predict_next_moonshot(historical_sequences, current_session)
    
    # Check prediction structure
    assert prediction["predicted"] == True
    assert prediction["confidence"] > 0.0
    assert prediction["predicted_multiplier"] >= 10.0
    assert "estimated_rounds_until" in prediction
    assert "similar_sequences_count" in prediction


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
    
    # Session 2: Different pattern
    session2_rounds = []
    for i in range(15):
        mult = 1.0 + i * 0.3
        if i in [7, 12]:  # Moonshots
            mult = 12.0 + i * 1.5
        session2_rounds.append({
            "id": f"s2_{i}",
            "multiplier": mult,
            "timestamp": (base_time + timedelta(seconds=600 + i*30)).isoformat() + "Z",  # Gap for new session
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
    assert result["scale_factor"] == 10.0


def test_scaling_factor():
    """Test that scaling factor affects filtering threshold."""
    settings = AnalysisSettings()
    predictor = MoonshotSequencePredictor(settings)
    
    # Test with different scale factors
    multipliers = [1.0, 5.0, 8.0, 12.0, 15.0, 20.0, 25.0]
    rounds = create_test_rounds(multipliers)
    
    # Default 10x scaling
    predictor.filtering_scale = 10.0
    predictor.extended_threshold = settings.moonshot_threshold * 10.0
    filtered_10x = predictor.filter_moonshot_rounds(rounds)
    
    # 5x scaling
    predictor.filtering_scale = 5.0
    predictor.extended_threshold = settings.moonshot_threshold * 5.0
    filtered_5x = predictor.filter_moonshot_rounds(rounds)
    
    # 10x should capture more moonshots than 5x
    assert len(filtered_10x) >= len(filtered_5x)


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