"""Regression tests for forecast range construction and moonshot boosts.

Covers the tail-state (Moonshot / Ignition) band handling introduced by the
forecast range fix: tail states must express the state band (p90..p95) instead
of being squeezed to a p50-weighted blend, with a finite data-aware cap, while
non-tail states keep the original blend formula.
"""

from datetime import datetime, timedelta
import math

from momento import forecast as fc
from momento.analysis import analyze
from momento.config import AnalysisSettings, RuntimeToggles


def make_rounds(multipliers):
    """Build a list of round dicts oldest-first.

    Args:
        multipliers: Sequence of multiplier values for each round.

    Returns:
        List of round dicts with id, multiplier, timestamp and band fields.
    """
    base_time = datetime.utcnow()
    rounds = []
    for i, mult in enumerate(multipliers):
        rounds.append({
            "id": f"r{i}",
            "multiplier": mult,
            "timestamp": (base_time + timedelta(seconds=i * 20)).isoformat() + "Z",
            "band": "high" if mult >= 5.0 else "low",
        })
    return rounds


def forecast_payload(rounds):
    """Compute an analysis payload for forecast(), avoiding DB access.

    `analyze` reads runtime toggles from the settings table by default; passing
    explicit toggles keeps the forecast pipeline fully in-memory.
    """
    return analyze(rounds, AnalysisSettings(), toggles=RuntimeToggles())


def test_moonshot_range_not_pinned_10x():
    """Tail-state range is not pinned to the 10x floor somewhere above it."""
    range_lo, range_hi, expected, mode = fc._forecast_range_for_state(
        "Moonshot", 8.0, 20.0, 3.0, 2.0,
        [1.2, 1.8, 2.4, 3.0, 4.1, 5.2, 7.0, 8.8, 12.5, 15.0],
    )

    assert range_hi > 10.0
    assert range_hi <= max(50.0, 15.0 * 1.5)  # data-aware cap
    assert range_lo >= 8.0
    assert range_lo < range_hi
    assert range_lo <= expected <= range_hi
    assert mode == "state_band"


def test_non_tail_states_preserve_formula():
    """Non-tail states keep the original blend-based range formula."""
    range_lo, range_hi, expected, mode = fc._forecast_range_for_state(
        "Normal", 2.0, 4.0, 2.5, 0.8, []
    )

    assert range_lo == round(max(1.0, min(2.0, 2.5 - 0.8 * 0.4)), 2)
    assert range_hi == round(max(range_lo + 0.05, min(4.0, 2.5 + 0.8 * 0.4)), 2)
    assert mode == "blend"


def test_cap_finiteness_extreme_outlier():
    """An extreme outlier in the tail window is bounded by a finite cap."""
    multipliers = [1.0] * 39 + [200.0]
    range_lo, range_hi, expected, mode = fc._forecast_range_for_state(
        "Moonshot", 8.0, 500.0, 3.0, 2.0, multipliers
    )

    assert math.isfinite(range_hi)
    assert range_hi <= max(50.0, 200.0 * 1.5)
    assert range_hi < 500.0  # capped below the raw band_hi
    assert mode == "state_band"


def test_ml_predictions_moonshot_boost():
    """A successful moonshot sequence analysis boosts over_10x probabilities."""
    multipliers = [1.2, 1.8, 2.4, 3.0, 4.1, 5.2, 7.0, 8.8, 12.5, 15.0]
    settings = AnalysisSettings()

    boosted_msa = {
        "status": "success",
        "prediction": {"predicted": True, "confidence": 0.9},
    }
    boosted = fc.ml_predictions(multipliers, settings, boosted_msa)

    assert boosted["available"] is True
    assert boosted["predictions"]["over_10x"]["moonshot_boost"] == round(0.9 * 0.15, 4)
    assert "over_20x" not in boosted["predictions"]  # only the _ML_WEIGHTS keys
    assert boosted["moonshot_sequence_influence"] > 0

    low_msa = {
        "status": "success",
        "prediction": {"predicted": False, "confidence": 0.9},
    }
    not_boosted = fc.ml_predictions(multipliers, settings, low_msa)

    assert not_boosted["predictions"]["over_10x"]["moonshot_boost"] == 0.0
    assert not_boosted["moonshot_sequence_influence"] == 0.0


def test_forecast_end_to_end_state_band():
    """A deterministic Moonshot window produces a state_band forecast range."""
    multipliers = [
        1.2, 1.5, 1.8, 2.0, 1.6, 2.2, 1.9, 2.4, 2.1, 3.0,
        2.6, 3.4, 2.8, 4.0, 3.2, 4.5, 3.8, 5.2, 4.4, 6.0,
        5.0, 7.2, 8.5, 9.0, 10.2, 11.0, 10.5, 11.8, 10.0, 12.5,
    ]
    rounds = make_rounds(multipliers)

    result = fc.forecast(rounds, AnalysisSettings(), analysis_payload=forecast_payload(rounds))

    assert result["predicted_state"] == "Moonshot"
    assert result["range_lo"] > 0.05
    assert result["range_lo"] < result["range_hi"]
    assert math.isfinite(result["range_lo"]) and math.isfinite(result["range_hi"])
    assert result["range_lo"] <= result["expected_multiplier"] <= result["range_hi"]
    # Tail state uses the state_band range construction.
    assert result["components"]["range_mode"] == "state_band"
    assert result["range_hi"] > 10.0