"""Unit tests for vocabulary processor."""

import pytest
from momento.vocabulary_processor import VocabularyProcessor, processor

def test_processor_initialization():
    """Test processor initializes correctly."""
    assert processor is not None
    state = processor.get_vocabulary_state()
    assert "total_entries" in state

def test_multiplier_to_concept():
    """Test multiplier to concept translation."""
    result = processor.multiplier_to_concept(2.5)
    assert "base" in result
    assert "custom" in result
    assert result["multiplier"] == 2.5

def test_batch_translate():
    """Test batch translation."""
    multipliers = [1.5, 2.0, 3.5]
    results = processor.batch_translate(multipliers)
    assert len(results) == 3

def test_register_pattern():
    """Test pattern registration."""
    pattern = {
        "type": "pattern",
        "name": "test_pattern",
        "mathematical_definition": {"multiplier_range": [1.0, 2.0]},
        "linguistic_mapping": {"description": "Test", "confidence": 0.9},
        "source": "test"
    }
    pattern_id = processor.register_pattern(pattern)
    assert pattern_id is not None
    assert pattern_id.startswith("vocab_")
