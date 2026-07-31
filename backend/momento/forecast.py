"""Forecast engine.

Combines three independent estimators and blends them into one forecast:

1. Markov state transitions  — where does this state usually go next?
2. Empirical percentiles     — what range does the recent distribution imply?
3. DNA / analogue matching   — what followed the last time the tape looked like this?

Every forecast is persisted so accuracy can be measured against reality later.
"""

from __future__ import annotations

import math
import statistics
from typing import Any, Dict, List, Optional, Sequence, Tuple

from . import analysis, db, linguistics as ling
from .config import AnalysisSettings


Round = Dict[str, Any]


# ---------------------------------------------------------------------------
# Markov transitions
# ---------------------------------------------------------------------------

def state_sequence(rounds: Sequence[Round], settings: AnalysisSettings) -> List[str]:
    """Rolling state label for every round (window of 40)."""
    multipliers = [float(r["multiplier"]) for r in rounds]
    labels: List[str] = []
    for index in range(len(multipliers)):
        window = multipliers[max(0, index - 39) : index + 1]
        if len(window) < 5:
            labels.append("Normal")
            continue
        signals = {
            "ascending_ladder": analysis.ascending_ladder(window, settings),
            "collapse_ladder": analysis.collapse_ladder(window, settings),
            "shelf": analysis.shelf_signal(window, settings),
            "bait": analysis.bait_signal(window, settings),
            "nested": analysis.nested_bands(window, settings),
        }
        state, _ = analysis.classify_state(signals, window, settings)
        labels.append(state)
    return labels


def transition_matrix(labels: Sequence[str]) -> Dict[str, Dict[str, float]]:
    """Row-normalised state transition probabilities with Laplace smoothing."""
    counts: Dict[str, Dict[str, float]] = {
        a: {b: 0.0 for b in ling.STATES} for a in ling.STATES
    }
    for current, following in zip(labels, labels[1:]):
        if current in counts and following in counts[current]:
            counts[current][following] += 1.0

    matrix: Dict[str, Dict[str, float]] = {}
    for state, row in counts.items():
        total = sum(row.values())
        if total == 0:
            matrix[state] = {b: round(1.0 / len(ling.STATES), 4) for b in ling.STATES}
            continue
        smoothed = {b: (row[b] + 0.5) for b in ling.STATES}
        smoothed_total = sum(smoothed.values())
        matrix[state] = {b: round(smoothed[b] / smoothed_total, 4) for b in ling.STATES}
    return matrix


# ---------------------------------------------------------------------------
# candidate predictions
# ---------------------------------------------------------------------------

def ladder_eta_adjustment(
    multipliers: Sequence[float],
    settings: AnalysisSettings
) -> Dict[str, Any]:
    """Calculate ETA adjustments based on ladder patterns.
    
    Args:
        multipliers: Sequence of multiplier values
        settings: Analysis settings
        
    Returns:
        Dictionary with ladder-based ETA adjustments
    """
    if len(multipliers) < 10:
        return {
            "ladder_eta_adjustment": 0,
            "ladder_pressure_factor": 0,
            "longest_ladder_eta": 0,
            "compression_release_eta": 0,
            "combined_eta_adjustment": 0
        }
    
    # Detect ladders
    ladders = ling.detect_ladders(multipliers, min_length=4)
    
    if not ladders:
        return {
            "ladder_eta_adjustment": 0,
            "ladder_pressure_factor": 0,
            "longest_ladder_eta": 0,
            "compression_release_eta": 0,
            "combined_eta_adjustment": 0
        }
    
    # Calculate ladder distances and pressure
    distance_info = ling.calculate_ladder_distances(ladders)
    pressure_info = ling.calculate_ladder_pressure(ladders, distance_info)
    
    # Get ceiling info for compression
    ceiling_info = ling.detect_resistance_ceilings(multipliers)
    compression_info = ling.calculate_compression_energy(multipliers, ceiling_info)
    
    # Calculate ladder ETA adjustment based on pressure score
    # Higher pressure = sooner ETA (negative adjustment)
    ladder_eta_adjustment = -pressure_info["pressure_score"] * 5  # Max -5 rounds adjustment
    
    # Calculate longest ladder ETA
    longest_ladder = max(ladders, key=lambda l: l.length) if ladders else None
    if longest_ladder:
        # Longer ladders suggest sooner moonshot
        longest_ladder_eta = -longest_ladder.length * 0.3  # Max -3 rounds for 10-round ladder
    else:
        longest_ladder_eta = 0
    
    # Calculate compression release ETA
    if compression_info.get("near_release"):
        compression_release_eta = -2  # Near release = 2 rounds sooner
    else:
        compression_release_eta = 0
    
    # Combine adjustments
    combined_eta = ladder_eta_adjustment + longest_ladder_eta + compression_release_eta
    
    return {
        "ladder_eta_adjustment": ladder_eta_adjustment,
        "ladder_pressure_factor": pressure_info["pressure_score"],
        "longest_ladder_eta": longest_ladder_eta,
        "compression_release_eta": compression_release_eta,
        "combined_eta_adjustment": combined_eta,
        "release_prediction": pressure_info["release_prediction"],
        "ladder_count": len(ladders)
    }


def _band_range_for_state(state: str, percentiles: Dict[str, float], settings: AnalysisSettings) -> Tuple[float, float]:
    """Map a predicted state onto a multiplier range."""
    p25 = percentiles.get("p25", 1.2)
    p50 = percentiles.get("p50", 1.8)
    p75 = percentiles.get("p75", 3.0)
    p90 = percentiles.get("p90", 7.0)
    p95 = percentiles.get("p95", 14.0)

    table: Dict[str, Tuple[float, float]] = {
        "Normal": (max(1.0, p25), max(1.1, p75)),
        "Collapse": (1.0, max(1.1, p25)),
        "Shelf": (max(1.0, p25), max(1.2, p50)),
        "Exhaustion": (1.0, max(1.2, p50)),
        "Bait": (1.0, max(1.3, p75)),
        "Ignition": (max(1.5, p75), max(settings.ignition_threshold, p95)),
        "Moonshot": (max(settings.ignition_threshold, p90), max(settings.mega_moonshot_threshold, p95 * 3)),
    }
    lo, hi = table.get(state, (max(1.0, p25), max(1.2, p75)))
    return round(max(1.0, lo), 2), round(max(lo + 0.05, hi), 2)


def candidates(rounds: Sequence[Round], settings: AnalysisSettings, analysis_payload: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Ranked prediction candidates for the next round with ladder-enhanced moonshot prediction."""
    multipliers = [float(r["multiplier"]) for r in rounds]
    if len(multipliers) < 8:
        return []

    payload = analysis_payload or analysis.analyze(rounds, settings)
    current_state = payload["state"]
    percentiles = payload["percentiles"]
    dist = payload["distribution"]
    dna = payload.get("dna_report", {})
    exhaustion = payload.get("band_exhaustion", {})
    advanced_features = payload.get("advanced_features", {})

    # Add ladder-enhanced moonshot prediction (selective integration)
    ladder_release_conditions = analysis.find_release_conditions(multipliers, settings)
    ladder_moonshot_probability = ladder_release_conditions["moonshot_probability"]
    ladder_eta_info = ladder_eta_adjustment(multipliers, settings)

    labels = state_sequence(rounds, settings)
    matrix = transition_matrix(labels)
    markov_row = matrix.get(current_state, {})

    # DNA outcome tilt: what actually followed similar tapes.
    outcomes = dna.get("outcomes") or {}
    dna_weight = min(0.35, float(dna.get("confidence", 0.0)) * 0.35)

    # Overdue-band tilt: pushes probability toward the upside states.
    overdue = exhaustion.get("most_overdue") or {}
    overdue_tilt = min(0.2, float(overdue.get("exhaustion", 0.0)) * 0.2)

    # Advanced feature tilts
    pressure_tilt = 0.0
    momentum_tilt = 0.0
    moonshot_tilt = 0.0
    band_collapse_tilt = 0.0
    ladder_moonshot_tilt = 0.0  # New: ladder-enhanced moonshot prediction

    if advanced_features and not advanced_features.get("error"):
        # Pressure tilt: boost moonshot/ignition when pressure is high
        pressure_data = advanced_features.get("pressure", {})
        if pressure_data:
            pressure_percent = float(pressure_data.get("pressure_percent", 0))
            if pressure_percent > 70.0:
                pressure_tilt = min(0.15, (pressure_percent - 70.0) / 100.0 * 0.15)

        # Momentum tilt from baseline analysis
        baseline_data = advanced_features.get("baseline", {})
        if baseline_data:
            shifts = baseline_data.get("shifts", [])
            if shifts:
                latest_shift = shifts[-1] if shifts else {}
                momentum_value = float(latest_shift.get("momentum", 0))
                if abs(momentum_value) > 5.0:
                    momentum_tilt = momentum_value / 100.0 * 0.1

        # Moonshot confidence tilt
        moonshot_data = advanced_features.get("moonshot", {})
        if moonshot_data:
            moonshot_confidence = float(moonshot_data.get("confidence", 0))
            if moonshot_confidence > 0.7:
                moonshot_tilt = min(0.12, (moonshot_confidence - 0.7) * 0.4)

        # Band collapse tilt from ladder analysis
        bands_data = advanced_features.get("bands", {})
        if bands_data:
            # Check for high collapse frequency in any band
            for band_name, band_info in bands_data.items():
                if isinstance(band_info, dict):
                    collapse_freq = float(band_info.get("collapse_frequency", 0))
                    if collapse_freq > 0.03:
                        band_collapse_tilt = min(0.1, collapse_freq * 3.0)
                        break

    # Ladder-enhanced moonshot tilt (selective integration for moonshot prediction only)
    if ladder_moonshot_probability > 0.6:
        # Strong ladder signal for moonshot
        ladder_moonshot_tilt = min(0.25, (ladder_moonshot_probability - 0.6) * 0.5)

    results: List[Dict[str, Any]] = []
    for state in ling.STATES:
        probability = float(markov_row.get(state, 0.0))

        if outcomes and dna_weight > 0:
            if state in ("Moonshot", "Ignition"):
                probability = probability * (1 - dna_weight) + float(outcomes.get("over_5x", 0.0)) * dna_weight
            elif state in ("Collapse", "Exhaustion"):
                probability = probability * (1 - dna_weight) + (1.0 - float(outcomes.get("over_2x", 0.0))) * dna_weight

        if state in ("Moonshot", "Ignition"):
            probability += overdue_tilt
            probability += pressure_tilt
            if state == "Moonshot":
                probability += moonshot_tilt
                probability += ladder_moonshot_tilt  # Apply ladder-enhanced moonshot prediction
        elif state in ("Collapse", "Exhaustion"):
            probability = max(0.0, probability - overdue_tilt * 0.5)
            probability += band_collapse_tilt

        # Apply momentum tilt based on direction
        if momentum_tilt > 0 and state in ("Moonshot", "Ignition"):
            probability += momentum_tilt
        elif momentum_tilt < 0 and state in ("Collapse", "Exhaustion"):
            probability += abs(momentum_tilt)

        lo, hi = _band_range_for_state(state, percentiles, settings)
        results.append(
            {
                "state": state,
                "probability": probability,
                "range_lo": lo,
                "range_hi": hi,
                "label": ling.STATE_META[state]["meaning"],
                "color": ling.STATE_META[state]["color"],
                "breakout_target": round(hi, 2),
                "note": f"transition from {current_state}",
            }
        )

    total = sum(r["probability"] for r in results) or 1.0
    for entry in results:
        entry["probability"] = round(entry["probability"] / total, 4)

    results.sort(key=lambda r: r["probability"], reverse=True)

    # Attach a survival-implied hit probability for the range.
    for entry in results:
        threshold = entry["range_lo"]
        key = None
        for candidate_key in ("2x", "3x", "5x", "10x", "20x", "50x", "100x"):
            if float(candidate_key[:-1]) <= threshold:
                key = candidate_key
        entry["survival_estimate"] = dist.get(key, dist.get("2x", 0.0)) if key else 1.0

    return results


def forecast(rounds: Sequence[Round], settings: AnalysisSettings, analysis_payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """The headline forecast: state, confidence, range and horizon."""
    multipliers = [float(r["multiplier"]) for r in rounds]
    if len(multipliers) < 8:
        return {
            "predicted_state": "Normal",
            "predicted_band": "—",
            "confidence": 0.0,
            "range_lo": 1.0,
            "range_hi": 2.0,
            "horizon": settings.forecast_horizon,
            "note": "Insufficient history — need at least 8 rounds.",
            "candidates": [],
            "components": {},
        }

    payload = analysis_payload or analysis.analyze(rounds, settings)
    ranked = candidates(rounds, settings, payload)
    top = ranked[0]

    percentiles = payload["percentiles"]
    dna = payload.get("dna_report", {})
    outcomes = dna.get("outcomes") or {}
    advanced_features = payload.get("advanced_features", {})

    # Component estimates for the expected multiplier.
    markov_mid = (top["range_lo"] + top["range_hi"]) / 2.0
    percentile_mid = float(percentiles.get("p50", markov_mid))
    dna_mid = float(outcomes.get("median", percentile_mid)) if outcomes else percentile_mid

    # Advanced feature components
    feature_mid = percentile_mid  # Default to percentile if no features
    feature_weight = 0.0
    feature_contributors = {}

    if advanced_features and not advanced_features.get("error"):
        # Use baseline trendline as feature component
        baseline_data = advanced_features.get("baseline", {})
        if baseline_data:
            trendlines = baseline_data.get("trendlines", {})
            if trendlines:
                momentum = trendlines.get("momentum", [])
                if momentum:
                    latest_momentum = momentum[-1] if momentum else 0
                    # Convert momentum back to multiplier space (simplified)
                    feature_mid = max(1.0, percentile_mid + latest_momentum / 100.0)
                    feature_weight = 0.15
                    feature_contributors["baseline_momentum"] = round(latest_momentum, 2)

        # Adjust for moonshot confidence
        moonshot_data = advanced_features.get("moonshot", {})
        if moonshot_data:
            moonshot_confidence = float(moonshot_data.get("confidence", 0))
            if moonshot_confidence > 0.7:
                feature_weight = max(feature_weight, 0.2)
                feature_contributors["moonshot_confidence"] = round(moonshot_confidence, 3)

        # Adjust for pressure
        pressure_data = advanced_features.get("pressure", {})
        if pressure_data:
            pressure_percent = float(pressure_data.get("pressure_percent", 0))
            if pressure_percent > 80.0:
                feature_contributors["pressure_critical"] = round(pressure_percent, 1)

    weights = {
        "markov": 0.45,
        "percentile": 0.3,
        "dna": 0.25 if outcomes else 0.0,
        "features": feature_weight,
    }
    weight_total = sum(weights.values()) or 1.0
    expected = (
        markov_mid * weights["markov"] + 
        percentile_mid * weights["percentile"] + 
        dna_mid * weights["dna"] +
        feature_mid * weights["features"]
    ) / weight_total

    spread = max(0.15, statistics.pstdev(multipliers[-40:]) if len(multipliers) > 2 else 0.5)
    range_lo = round(max(1.0, min(top["range_lo"], expected - spread * 0.4)), 2)
    range_hi = round(max(range_lo + 0.05, max(top["range_hi"], expected + spread * 0.6)), 2)

    base_confidence = float(payload["prediction_confidence"]["confidence"])
    lead = top["probability"] - (ranked[1]["probability"] if len(ranked) > 1 else 0.0)
    
    # Boost confidence if advanced features are available and show strong signals
    feature_confidence_boost = 0.0
    if advanced_features and not advanced_features.get("error"):
        moonshot_confidence = float(advanced_features.get("moonshot", {}).get("confidence", 0))
        pressure_percent = float(advanced_features.get("pressure", {}).get("pressure_percent", 0))
        if moonshot_confidence > 0.8 or pressure_percent > 85.0:
            feature_confidence_boost = 0.05

    confidence = analysis.clamp((base_confidence * 0.55) + (lead * 1.4) + (float(dna.get("confidence", 0.0)) * 0.15) + feature_confidence_boost)

    return {
        "predicted_state": top["state"],
        "predicted_band": ling.band_label(expected),
        "expected_multiplier": round(expected, 2),
        "confidence": confidence,
        "confidence_label": "HIGH" if confidence >= 0.66 else ("MEDIUM" if confidence >= 0.38 else "LOW"),
        "range_lo": range_lo,
        "range_hi": range_hi,
        "horizon": settings.forecast_horizon,
        "candidates": ranked,
        "transition_matrix": transition_matrix(state_sequence(rounds, settings)),
        "components": {
            "markov_mid": round(markov_mid, 2),
            "percentile_mid": round(percentile_mid, 2),
            "dna_mid": round(dna_mid, 2),
            "feature_mid": round(feature_mid, 2),
            "weights": weights,
            "spread": round(spread, 3),
            "feature_contributors": feature_contributors,
        },
        "features_available": bool(advanced_features and not advanced_features.get("error")),
        "note": ling.sentence(top["state"], multipliers[-10:]),
    }


# ---------------------------------------------------------------------------
# persistence + accuracy
# ---------------------------------------------------------------------------

def record(source: str, payload: Dict[str, Any], anchor_round_id: Optional[int]) -> int:
    """Persist a forecast so its accuracy can be scored once reality lands."""
    return db.execute(
        """INSERT INTO forecasts
           (source, created_at, anchor_round_id, horizon, predicted_state, predicted_band,
            confidence, range_lo, range_hi, engine)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            source,
            db.utc_now(),
            anchor_round_id,
            int(payload.get("horizon", 5)),
            str(payload.get("predicted_state", "Normal")),
            str(payload.get("predicted_band", "—")),
            float(payload.get("confidence", 0.0)),
            float(payload.get("range_lo", 1.0)),
            float(payload.get("range_hi", 2.0)),
            "blend-v2",
        ),
    )


def resolve_pending(source: str, round_id: int, multiplier: float) -> int:
    """Score every open forecast against the round that just landed."""
    pending = db.query(
        """SELECT id, range_lo, range_hi FROM forecasts
           WHERE source = ? AND resolved = 0 AND (anchor_round_id IS NULL OR anchor_round_id < ?)
           ORDER BY created_at ASC LIMIT 50""",
        (source, round_id),
    )
    resolved = 0
    for row in pending:
        correct = 1 if float(row["range_lo"]) <= multiplier <= float(row["range_hi"]) else 0
        db.execute(
            """UPDATE forecasts
               SET resolved = 1, correct = ?, actual_multiplier = ?, resolved_at = ?
               WHERE id = ?""",
            (correct, float(multiplier), db.utc_now(), int(row["id"])),
        )
        resolved += 1
    return resolved


def accuracy(source: str) -> Dict[str, Any]:
    """Realised forecast accuracy over several look-back windows."""
    rows = db.query(
        """SELECT correct, confidence, predicted_state, resolved_at FROM forecasts
           WHERE source = ? AND resolved = 1 ORDER BY resolved_at DESC LIMIT 500""",
        (source,),
    )
    if not rows:
        return {"overall": 0.0, "last_10": 0.0, "last_50": 0.0, "total": 0, "by_state": {}, "brier": 0.0}

    flags = [int(row["correct"] or 0) for row in rows]

    def rate(values: Sequence[int]) -> float:
        return round(sum(values) / len(values), 4) if values else 0.0

    by_state: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        state = str(row["predicted_state"])
        bucket = by_state.setdefault(state, {"total": 0, "hits": 0})
        bucket["total"] += 1
        bucket["hits"] += int(row["correct"] or 0)
    for bucket in by_state.values():
        bucket["accuracy"] = round(bucket["hits"] / bucket["total"], 4)

    brier = statistics.fmean(
        [(float(row["confidence"] or 0.0) - int(row["correct"] or 0)) ** 2 for row in rows]
    )

    return {
        "overall": rate(flags),
        "last_10": rate(flags[:10]),
        "last_50": rate(flags[:50]),
        "last_100": rate(flags[:100]),
        "total": len(flags),
        "by_state": by_state,
        "brier": round(brier, 4),
        "calibration": round(1.0 - min(1.0, brier * 4), 4),
    }


def pending_count(source: str) -> int:
    row = db.query_one("SELECT COUNT(*) AS c FROM forecasts WHERE source = ? AND resolved = 0", (source,))
    return int(row["c"]) if row else 0


# ---------------------------------------------------------------------------
# lightweight ensemble model (pure python, no sklearn dependency)
# ---------------------------------------------------------------------------

def ml_features(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, float]:
    """Feature vector for the logistic ensemble."""
    window = list(multipliers)[-40:]
    if len(window) < 8:
        return {}
    logs = [math.log(max(1.01, m)) for m in window]
    recent = window[-8:]
    return {
        "mean_log": round(statistics.fmean(logs), 4),
        "std_log": round(statistics.pstdev(logs), 4) if len(logs) > 1 else 0.0,
        "last_log": round(math.log(max(1.01, window[-1])), 4),
        "low_share": round(sum(1 for m in window if m < settings.low_band_threshold) / len(window), 4),
        "high_share": round(sum(1 for m in window if m >= settings.ignition_threshold) / len(window), 4),
        "recent_mean": round(statistics.fmean(recent), 4),
        "trend": round(statistics.fmean(logs[-8:]) - statistics.fmean(logs[:8]), 4),
        "max_log": round(max(logs), 4),
    }


_ML_WEIGHTS: Dict[str, Dict[str, float]] = {
    # Trained offline on the survival model; kept explicit and inspectable.
    "over_2x": {"bias": -0.35, "mean_log": 1.15, "std_log": 0.42, "last_log": -0.28, "low_share": -1.60, "high_share": 0.85, "trend": 0.55, "max_log": 0.12},
    "over_5x": {"bias": -1.45, "mean_log": 0.95, "std_log": 0.78, "last_log": -0.18, "low_share": -1.15, "high_share": 1.30, "trend": 0.62, "max_log": 0.22},
    "over_10x": {"bias": -2.30, "mean_log": 0.70, "std_log": 0.92, "last_log": -0.12, "low_share": -0.85, "high_share": 1.65, "trend": 0.58, "max_log": 0.30},
}


def _sigmoid(value: float) -> float:
    if value < -60:
        return 0.0
    if value > 60:
        return 1.0
    return 1.0 / (1.0 + math.exp(-value))


def ml_predictions(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """Logistic ensemble over the engineered features, blended with the empirical rate."""
    features = ml_features(multipliers, settings)
    if not features:
        return {"available": False, "note": "Need at least 8 rounds.", "features": {}, "predictions": {}}

    empirical = ling.distribution(multipliers)
    predictions: Dict[str, Any] = {}

    for target, weights in _ML_WEIGHTS.items():
        z = weights["bias"]
        for key, weight in weights.items():
            if key == "bias":
                continue
            z += weight * features.get(key, 0.0)
        model_prob = _sigmoid(z)
        threshold_key = target.replace("over_", "")
        empirical_prob = float(empirical.get(threshold_key, 0.0))
        blended = analysis.clamp(model_prob * 0.6 + empirical_prob * 0.4)
        predictions[target] = {
            "model": round(model_prob, 4),
            "empirical": round(empirical_prob, 4),
            "blended": blended,
            "edge": round(blended - empirical_prob, 4),
        }

    return {
        "available": True,
        "features": features,
        "predictions": predictions,
        "samples": len(multipliers),
        "model": "logistic-ensemble-v2",
    }
