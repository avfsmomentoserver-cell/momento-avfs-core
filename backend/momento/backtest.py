"""Backtesting framework for the Investigation Suite.

This module provides functions to run historical backtests, split rounds into sessions,
simulate predictions, measure accuracy, and analyze feature impact.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence

from . import analysis, config, db, forecast, store
from .config import BacktestingSettings

logger = logging.getLogger("momento.backtest")


def split_test_phases(
    rounds: List[Dict[str, Any]],
    warmup_pct: float = 0.1,
    stress_pct: float = 0.3
) -> Dict[str, List[Dict[str, Any]]]:
    """Split rounds into test phases for intelligent validation.
    
    Phases:
    - Warmup: First 10% of data (system stabilization)
    - Normal: Middle 60% of data (standard operation)
    - Stress: Last 30% of data (edge cases, moonshots)
    
    Args:
        rounds: List of round dictionaries
        warmup_pct: Percentage for warmup phase
        stress_pct: Percentage for stress phase
        
    Returns:
        Dictionary with 'warmup', 'normal', 'stress' keys
    """
    if not rounds:
        return {"warmup": [], "normal": [], "stress": []}
    
    total = len(rounds)
    warmup_end = int(total * warmup_pct)
    stress_start = int(total * (1 - stress_pct))
    
    return {
        "warmup": rounds[:warmup_end],
        "normal": rounds[warmup_end:stress_start],
        "stress": rounds[stress_start:]
    }


def backtest_ladder_patterns(
    rounds: List[Dict[str, Any]],
    settings: AnalysisSettings
) -> Dict[str, Any]:
    """Backtest ladder pattern effectiveness for moonshot prediction.
    
    Args:
        rounds: List of round dictionaries
        settings: Analysis settings
        
    Returns:
        Dictionary with backtest results
    """
    from . import linguistics as ling
    
    if not rounds:
        return {
            "ladder_to_moonshot_rate": 0.0,
            "longest_ladder_moonshot_rate": 0.0,
            "pattern_accuracy": 0.0,
            "false_positive_rate": 0.0,
            "time_to_outcome": {},
            "total_ladders": 0,
            "moonshot_count": 0
        }
    
    multipliers = [float(r["multiplier"]) for r in rounds]
    
    # Detect ladders
    ladders = ling.detect_ladders(multipliers, min_length=4)
    
    # Find moonshots (multipliers >= 20)
    moonshot_indices = [i for i, m in enumerate(multipliers) if m >= 20.0]
    
    # Calculate ladder-to-moonshot correlation
    ladder_to_moonshot = 0
    longest_ladders = sorted(ladders, key=lambda l: l.length, reverse=True)[:5]
    longest_ladder_moonshot = 0
    
    for ladder in ladders:
        # Check if moonshot occurs within 10 rounds after ladder
        window_end = min(len(multipliers), ladder.end_index + 10)
        moonshot_in_window = any(i in moonshot_indices for i in range(ladder.end_index + 1, window_end))
        
        if moonshot_in_window:
            ladder_to_moonshot += 1
            
            # Check if this is one of the longest ladders
            if ladder in longest_ladders:
                longest_ladder_moonshot += 1
    
    # Calculate metrics
    total_ladders = len(ladders)
    ladder_to_moonshot_rate = ladder_to_moonshot / total_ladders if total_ladders > 0 else 0.0
    longest_ladder_moonshot_rate = longest_ladder_moonshot / len(longest_ladders) if longest_ladders else 0.0
    
    # Pattern accuracy (how often ladders predict next band correctly)
    correct_predictions = 0
    for ladder in ladders:
        if ladder.end_index + 1 < len(multipliers):
            next_mult = multipliers[ladder.end_index + 1]
            next_band = ling.band_for(next_mult)["key"]
            # Simple prediction: ascend ladder predicts higher band, collapse predicts lower
            predicted_band = "high" if ladder.ladder_type == "ascend" else "low"
            actual_band = "high" if next_mult >= 5.0 else "low"
            if predicted_band == actual_band:
                correct_predictions += 1
    
    pattern_accuracy = correct_predictions / total_ladders if total_ladders > 0 else 0.0
    
    # False positive rate (ladders that don't lead to significant movement)
    false_positives = 0
    for ladder in ladders:
        if ladder.end_index + 1 < len(multipliers):
            next_mult = multipliers[ladder.end_index + 1]
            movement = abs(next_mult - ladder.end_multiplier)
            if movement < 1.0:  # Less than 1x movement
                false_positives += 1
    
    false_positive_rate = false_positives / total_ladders if total_ladders > 0 else 0.0
    
    # Time to outcome distribution
    time_to_outcome = []
    for ladder in ladders:
        if ladder.end_index + 1 < len(multipliers):
            next_mult = multipliers[ladder.end_index + 1]
            if next_mult >= 20.0:  # Moonshot
                time_to_outcome.append(1)  # Immediate next round
            elif next_mult >= 10.0:  # Ignition
                time_to_outcome.append(2)
            else:
                time_to_outcome.append(3)  # Other
    
    time_distribution = {
        "immediate": time_to_outcome.count(1),
        "short": time_to_outcome.count(2),
        "long": time_to_outcome.count(3),
        "avg": sum(time_to_outcome) / len(time_to_outcome) if time_to_outcome else 0
    }
    
    return {
        "ladder_to_moonshot_rate": round(ladder_to_moonshot_rate, 4),
        "longest_ladder_moonshot_rate": round(longest_ladder_moonshot_rate, 4),
        "pattern_accuracy": round(pattern_accuracy, 4),
        "false_positive_rate": round(false_positive_rate, 4),
        "time_to_outcome": time_distribution,
        "total_ladders": total_ladders,
        "moonshot_count": len(moonshot_indices),
        "ladder_summary": {
            "ascend_count": sum(1 for l in ladders if l.ladder_type == "ascend"),
            "collapse_count": sum(1 for l in ladders if l.ladder_type == "collapse"),
            "avg_length": sum(l.length for l in ladders) / total_ladders if total_ladders else 0,
            "longest_ladder_length": max(l.length for l in ladders) if ladders else 0
        }
    }


def compute_advanced_metrics(
    predictions: List[Dict[str, Any]],
    actuals: Sequence[Dict[str, Any]]
) -> Dict[str, float]:
    """Compute comprehensive accuracy metrics.
    
    Metrics:
    - Precision: True positives / (true positives + false positives)
    - Recall: True positives / (true positives + false negatives)
    - F1 Score: Harmonic mean of precision and recall
    - MAE: Mean absolute error for continuous predictions
    - RMSE: Root mean square error
    
    Args:
        predictions: List of prediction results
        actuals: Actual rounds that occurred
        
    Returns:
        Dictionary of metric values
    """
    if not predictions or not actuals:
        return {
            "precision": 0.0,
            "recall": 0.0,
            "f1_score": 0.0,
            "mae": 0.0,
            "rmse": 0.0,
            "accuracy": 0.0
        }
    
    # Simple band-based accuracy
    hits = 0
    tested = min(len(predictions), len(actuals))
    
    pred_bands = []
    actual_bands = []
    pred_multipliers = []
    actual_multipliers = []
    
    for i in range(tested):
        pred = predictions[i]
        actual = actuals[i]
        
        pred_band = pred.get("band")
        actual_band = actual.get("band")
        pred_mult = pred.get("multiplier", 0)
        actual_mult = actual.get("multiplier", 0)
        
        if pred_band and actual_band:
            pred_bands.append(pred_band)
            actual_bands.append(actual_band)
            pred_multipliers.append(pred_mult)
            actual_multipliers.append(actual_mult)
            
            if pred_band == actual_band:
                hits += 1
    
    accuracy = hits / tested if tested > 0 else 0.0
    
    # Calculate precision/recall for positive class (moonshot)
    if pred_bands and actual_bands:
        true_positives = sum(1 for p, a in zip(pred_bands, actual_bands) if p == "moonshot" and a == "moonshot")
        false_positives = sum(1 for p, a in zip(pred_bands, actual_bands) if p == "moonshot" and a != "moonshot")
        false_negatives = sum(1 for p, a in zip(pred_bands, actual_bands) if p != "moonshot" and a == "moonshot")
        
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    else:
        precision = 0.0
        recall = 0.0
        f1_score = 0.0
    
    # Calculate MAE and RMSE for multipliers
    if pred_multipliers and actual_multipliers:
        import math
        errors = [abs(p - a) for p, a in zip(pred_multipliers, actual_multipliers)]
        mae = sum(errors) / len(errors) if errors else 0.0
        rmse = math.sqrt(sum(e**2 for e in errors) / len(errors)) if errors else 0.0
    else:
        mae = 0.0
        rmse = 0.0
    
    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1_score, 4),
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "accuracy": round(accuracy, 4)
    }


def ab_test_feature(
    rounds: List[Dict[str, Any]],
    feature_name: str,
    config_a: Dict[str, Any],
    config_b: Dict[str, Any],
    settings: Optional[config.AnalysisSettings] = None,
    toggles: Optional[config.RuntimeToggles] = None
) -> Dict[str, Any]:
    """Run A/B test between two feature configurations.
    
    Args:
        rounds: Historical rounds for testing
        feature_name: Name of feature to test
        config_a: First configuration
        config_b: Second configuration
        settings: Analysis settings override
        toggles: Runtime toggles override
        
    Returns:
        Dictionary with A/B test results and statistical significance
    """
    if settings is None:
        settings = store.analysis_settings()
    if toggles is None:
        toggles = store.runtime_toggles()
    
    # Run configuration A
    results_a = run_backtest("aviator", {**config_a, "feature_name": feature_name}, settings, toggles)
    
    # Run configuration B
    results_b = run_backtest("aviator", {**config_b, "feature_name": feature_name}, settings, toggles)
    
    # Calculate statistical significance (simple t-test approximation)
    acc_a = results_a.get("baseline_accuracy", 0.0)
    acc_b = results_b.get("baseline_accuracy", 0.0)
    
    delta = acc_b - acc_a
    significance = "unknown"
    
    if abs(delta) > 0.05:
        significance = "high" if delta > 0 else "high (negative)"
    elif abs(delta) > 0.02:
        significance = "medium" if delta > 0 else "medium (negative)"
    else:
        significance = "low"
    
    winner = "config_b" if delta > 0 else "config_a" if delta < 0 else "tie"
    
    return {
        "config_a_accuracy": acc_a,
        "config_b_accuracy": acc_b,
        "delta": round(delta, 4),
        "significance": significance,
        "winner": winner,
        "results_a": results_a,
        "results_b": results_b
    }


def split_by_sessions(
    rounds: Sequence[Dict[str, Any]],
    gap_seconds: int = 300,
) -> List[List[Dict[str, Any]]]:
    """Split rounds into sessions based on time gaps.

    Args:
        rounds: List of round dictionaries with timestamp field
        gap_seconds: Seconds of silence that ends a session

    Returns:
        List of sessions, each session is a list of rounds
    """
    if not rounds:
        return []

    sessions: List[List[Dict[str, Any]]] = []
    current_session: List[Dict[str, Any]] = []
    last_timestamp = None

    for round_data in sorted(rounds, key=lambda r: r["timestamp"]):
        timestamp = round_data["timestamp"]

        if last_timestamp is None:
            current_session.append(round_data)
            last_timestamp = timestamp
            continue

        # Parse timestamps and check gap
        try:
            last_dt = datetime.fromisoformat(last_timestamp.replace("Z", "+00:00"))
            current_dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            gap_seconds_actual = (current_dt - last_dt).total_seconds()

            if gap_seconds_actual >= gap_seconds:
                # Start new session
                if current_session:
                    sessions.append(current_session)
                current_session = [round_data]
            else:
                current_session.append(round_data)

            last_timestamp = timestamp
        except (ValueError, TypeError):
            logger.warning("Failed to parse timestamp for session split: %s", timestamp)
            current_session.append(round_data)
            last_timestamp = timestamp

    if current_session:
        sessions.append(current_session)

    return sessions


def simulate_prediction(
    rounds: Sequence[Dict[str, Any]],
    settings: config.AnalysisSettings,
    toggles: config.RuntimeToggles,
) -> Dict[str, Any]:
    """Run full system prediction on a session of rounds.

    Args:
        rounds: Session of rounds to predict on
        settings: Analysis settings to use
        toggles: Runtime toggles to apply

    Returns:
        Prediction results with state, confidence, and actual outcomes
    """
    if not rounds:
        return {"predictions": [], "accuracy": 0.0, "tested": 0}

    # Run analysis
    payload = analysis.analyze(rounds, settings)

    # Run forecast if enabled
    predictions = []
    if toggles.forecast_engine:
        fc = forecast.forecast(rounds, settings, payload)
        predictions = fc.get("candidates", [])

    return {
        "predictions": predictions,
        "state": payload.get("state"),
        "state_scores": payload.get("state_scores", {}),
        "confidence": payload.get("prediction_confidence", {}),
        "rounds_count": len(rounds),
    }


def measure_accuracy(
    predictions: List[Dict[str, Any]],
    actual_rounds: Sequence[Dict[str, Any]],
) -> Dict[str, Any]:
    """Measure prediction accuracy against actual outcomes.

    Args:
        predictions: List of prediction results
        actual_rounds: Actual rounds that occurred

    Returns:
        Accuracy metrics
    """
    if not predictions or not actual_rounds:
        return {"accuracy": 0.0, "hits": 0, "tested": 0}

    hits = 0
    tested = min(len(predictions), len(actual_rounds))

    for i in range(tested):
        pred = predictions[i]
        actual = actual_rounds[i]

        # Simple accuracy: did predicted band match actual band?
        pred_band = pred.get("band")
        actual_band = actual.get("band")

        if pred_band and actual_band and pred_band == actual_band:
            hits += 1

    accuracy = hits / tested if tested > 0 else 0.0

    return {
        "accuracy": accuracy,
        "hits": hits,
        "tested": tested,
    }


def run_backtest(
    source: str,
    config_dict: Dict[str, Any],
    settings: Optional[config.AnalysisSettings] = None,
    toggles: Optional[config.RuntimeToggles] = None,
) -> Dict[str, Any]:
    """Run a complete backtest on historical data.

    Args:
        source: Data source to backtest
        config_dict: Backtest configuration
        settings: Override analysis settings
        toggles: Override runtime toggles

    Returns:
        Backtest run results
    """
    now = db.utc_now()

    # Get settings
    if settings is None:
        settings = store.analysis_settings()
    if toggles is None:
        toggles = store.runtime_toggles()

    # Apply config overrides
    if "session_gap" in config_dict:
        settings = settings.merge({"session_gap_seconds": config_dict["session_gap"]})
    if "window_size" in config_dict:
        settings = settings.merge({"max_rounds_buffer": config_dict["window_size"]})

    # Get rounds with ingest_method filter if specified
    ingest_method = config_dict.get("ingest_method", "file")
    rounds = store.history(source, config_dict.get("max_rounds", 10000), ingest_method=ingest_method)

    if not rounds:
        return {
            "status": "error",
            "error": "No rounds found for backtest",
            "source": source,
            "config": config_dict,
        }

    # Split into sessions
    gap_seconds = config_dict.get("session_gap", settings.session_gap_seconds)
    sessions = split_by_sessions(rounds, gap_seconds)

    # Filter sessions by minimum rounds
    min_session_rounds = config_dict.get("min_session_rounds", 10)
    sessions = [s for s in sessions if len(s) >= min_session_rounds]

    if not sessions:
        return {
            "status": "error",
            "error": "No sessions meet minimum round requirement",
            "source": source,
            "config": config_dict,
        }

    # Baseline run
    baseline_results = []
    for session in sessions:
        result = simulate_prediction(session, settings, toggles)
        baseline_results.append(result)

    # Calculate baseline accuracy
    baseline_accuracy = 0.0
    total_tested = 0
    total_hits = 0

    for result in baseline_results:
        if result["rounds_count"] > 0:
            # Measure accuracy against actual outcomes
            accuracy = measure_accuracy(result["predictions"], session)
            total_hits += accuracy["hits"]
            total_tested += accuracy["tested"]

    if total_tested > 0:
        baseline_accuracy = total_hits / total_tested

    # Feature toggle run (if specified)
    feature_accuracy = None
    impact_score = None

    if "feature_toggles" in config_dict:
        # Create modified toggles
        feature_toggles = config_dict["feature_toggles"]
        modified_toggles = toggles.merge(feature_toggles)

        feature_results = []
        for session in sessions:
            result = simulate_prediction(session, settings, modified_toggles)
            feature_results.append(result)

        # Calculate feature accuracy
        feature_total_hits = 0
        feature_total_tested = 0

        for i, result in enumerate(feature_results):
            if result["rounds_count"] > 0:
                accuracy = measure_accuracy(result["predictions"], sessions[i])
                feature_total_hits += accuracy["hits"]
                feature_total_tested += accuracy["tested"]

        if feature_total_tested > 0:
            feature_accuracy = feature_total_hits / feature_total_tested
            impact_score = feature_accuracy - baseline_accuracy

    return {
        "status": "completed",
        "source": source,
        "config": config_dict,
        "total_sessions": len(sessions),
        "sessions_tested": len(sessions),
        "baseline_accuracy": baseline_accuracy,
        "feature_accuracy": feature_accuracy,
        "impact_score": impact_score,
        "results": {
            "baseline": baseline_results,
            "feature": feature_results if "feature_toggles" in config_dict else None,
        },
        "started_at": now,
        "completed_at": db.utc_now(),
    }


def create_backtest_run(
    source: str,
    config_dict: Dict[str, Any],
) -> int:
    """Create a backtest run record in the database.

    Args:
        source: Data source
        config_dict: Backtest configuration

    Returns:
        Backtest run ID
    """
    now = db.utc_now()
    config_json = json.dumps(config_dict)

    row_id = db.execute(
        """INSERT INTO backtest_runs (source, config, status, created_at)
           VALUES (?, ?, 'pending', ?)""",
        (source, config_json, now),
    )

    return row_id


def update_backtest_run(
    run_id: int,
    results: Dict[str, Any],
) -> None:
    """Update a backtest run with results.

    Args:
        run_id: Backtest run ID
        results: Backtest results
    """
    results_json = json.dumps(results.get("results", {}))
    error = results.get("error")

    db.execute(
        """UPDATE backtest_runs
           SET status = ?,
               total_sessions = ?,
               sessions_tested = ?,
               baseline_accuracy = ?,
               feature_accuracy = ?,
               impact_score = ?,
               results = ?,
               error = ?,
               completed_at = ?
           WHERE id = ?""",
        (
            results.get("status", "pending"),
            results.get("total_sessions", 0),
            results.get("sessions_tested", 0),
            results.get("baseline_accuracy"),
            results.get("feature_accuracy"),
            results.get("impact_score"),
            results_json,
            error,
            results.get("completed_at"),
            run_id,
        ),
    )


def get_backtest_runs(source: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get backtest runs for a source.

    Args:
        source: Data source
        limit: Maximum number of runs to return

    Returns:
        List of backtest runs
    """
    rows = db.query(
        """SELECT id, source, config, status, total_sessions, sessions_tested,
                  baseline_accuracy, feature_accuracy, impact_score,
                  started_at, completed_at, created_at
           FROM backtest_runs
           WHERE source = ?
           ORDER BY created_at DESC
           LIMIT ?""",
        (source, limit),
    )

    runs = []
    for row in db.rows_to_dicts(rows):
        run = row.copy()
        if row["config"]:
            run["config"] = json.loads(row["config"])
        runs.append(run)

    return runs


def get_backtest_run(run_id: int) -> Optional[Dict[str, Any]]:
    """Get a specific backtest run.

    Args:
        run_id: Backtest run ID

    Returns:
        Backtest run data or None
    """
    row = db.query_one(
        """SELECT id, source, config, status, total_sessions, sessions_tested,
                  baseline_accuracy, feature_accuracy, impact_score,
                  results, error, started_at, completed_at, created_at
           FROM backtest_runs
           WHERE id = ?""",
        (run_id,),
    )

    if not row:
        return None

    run = db.rows_to_dicts([row])[0]
    if run["config"]:
        run["config"] = json.loads(run["config"])
    if run["results"]:
        run["results"] = json.loads(run["results"])

    return run


def delete_backtest_run(run_id: int) -> bool:
    """Delete a backtest run.

    Args:
        run_id: Backtest run ID

    Returns:
        True if deleted, False otherwise
    """
    db.execute("DELETE FROM backtest_runs WHERE id = ?", (run_id,))
    return True


def backtest_eta_predictions(
    rounds: List[Dict[str, Any]],
    target_ranges: List[float] = None
) -> Dict[str, Any]:
    """Backtest ETA prediction accuracy for moonshot ranges.
    
    Args:
        rounds: Historical rounds
        target_ranges: Target multipliers to test (default: [12, 20, 30, 50])
        
    Returns:
        Dictionary with ETA backtest results
    """
    if target_ranges is None:
        target_ranges = [12.0, 20.0, 30.0, 50.0]
    
    if not rounds or len(rounds) < 50:
        return {
            "status": "error",
            "error": "Insufficient data for ETA backtest",
            "results": {}
        }
    
    from features.moonshot_scanner.linguistics import MoonshotLinguistics
    
    linguistics = MoonshotLinguistics()
    results = {}
    
    for target in target_ranges:
        # Find all occurrences of this target
        hit_indices = [i for i, r in enumerate(rounds) if r["multiplier"] >= target]
        
        if not hit_indices:
            results[f"{target}x"] = {
                "accuracy": 0.0,
                "mae": 0.0,
                "predictions": 0,
                "note": "No hits found"
            }
            continue
        
        # For each hit (except the last), test ETA prediction
        predictions = []
        actuals = []
        
        for i in range(len(hit_indices) - 1):
            hit_idx = hit_indices[i]
            next_hit_idx = hit_indices[i + 1]
            
            # Use rounds up to current hit to predict ETA to next hit
            training_rounds = rounds[:hit_idx + 1]
            eta_result = linguistics.compute_range_eta(training_rounds, [target])
            
            if eta_result.get("range_predictions"):
                pred = next((p for p in eta_result["range_predictions"] if p["target"] == target), None)
                if pred and pred.get("expected_rounds"):
                    predicted_rounds = pred["expected_rounds"]
                    actual_rounds = next_hit_idx - hit_idx
                    
                    predictions.append(predicted_rounds)
                    actuals.append(actual_rounds)
        
        if predictions:
            # Calculate accuracy (within ±20%)
            accurate = sum(1 for p, a in zip(predictions, actuals) if abs(p - a) / a <= 0.2)
            accuracy = accurate / len(predictions)
            
            # Calculate MAE
            mae = sum(abs(p - a) for p, a in zip(predictions, actuals)) / len(predictions)
            
            results[f"{target}x"] = {
                "accuracy": round(accuracy, 4),
                "mae": round(mae, 2),
                "predictions": len(predictions),
                "avg_predicted": round(sum(predictions) / len(predictions), 2),
                "avg_actual": round(sum(actuals) / len(actuals), 2)
            }
        else:
            results[f"{target}x"] = {
                "accuracy": 0.0,
                "mae": 0.0,
                "predictions": 0,
                "note": "No valid predictions"
            }
    
    return {
        "status": "completed",
        "results": results,
        "target_ranges": target_ranges
    }


def backtest_exhaustion_signals(
    rounds: List[Dict[str, Any]],
    pressure_history: List[float] = None,
    ceilings: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Backtest exhaustion signal effectiveness.
    
    Args:
        rounds: Historical rounds
        pressure_history: Historical pressure values
        ceilings: Resistance ceilings
        
    Returns:
        Dictionary with exhaustion backtest results
    """
    if not rounds or len(rounds) < 30:
        return {
            "status": "error",
            "error": "Insufficient data for exhaustion backtest",
            "results": {}
        }
    
    from features.moonshot_scanner.exhaustion import ExhaustionCalculator
    from features.pressure.calculator import PressureCalculator
    from features.pressure.detector import CeilingDetector
    
    calculator = ExhaustionCalculator()
    
    # Generate pressure history if not provided
    if pressure_history is None:
        pressure_calc = PressureCalculator()
        pressure_history = []
        for i in range(20, len(rounds)):
            window = rounds[i-20:i]
            pressure_result = pressure_calc.compute_pressure(window, [])
            pressure_history.append(pressure_result.get("pressure_percent", 0))
    
    # Generate ceilings if not provided
    if ceilings is None:
        detector = CeilingDetector()
        multipliers = [r["multiplier"] for r in rounds]
        ceilings = detector.detect_resistance_ceilings([{"multiplier": m} for m in multipliers])
    
    # Find moonshot events
    moonshot_indices = [i for i, r in enumerate(rounds) if r["multiplier"] >= 20.0]
    
    results = {
        "exhaustion_effectiveness": {},
        "release_window_accuracy": {},
        "total_moonshots": len(moonshot_indices)
    }
    
    # Test each exhaustion type
    for i in range(30, len(rounds) - 10):
        window_rounds = rounds[:i]
        window_pressure = pressure_history[:i-30] if len(pressure_history) >= i-30 else pressure_history
        
        # Calculate exhaustion
        exhaustion = calculator.compute_combined_exhaustion(window_rounds, window_pressure, ceilings)
        
        # Check if moonshot occurs in next 10 rounds
        upcoming_moonshot = any(idx in range(i, min(i+10, len(rounds))) for idx in moonshot_indices)
        
        # Test if high exhaustion predicts moonshot
        if exhaustion["combined_exhaustion_score"] >= 0.7:
            if upcoming_moonshot:
                results["exhaustion_effectiveness"]["true_positive"] = results["exhaustion_effectiveness"].get("true_positive", 0) + 1
            else:
                results["exhaustion_effectiveness"]["false_positive"] = results["exhaustion_effectiveness"].get("false_positive", 0) + 1
        elif upcoming_moonshot:
            results["exhaustion_effectiveness"]["false_negative"] = results["exhaustion_effectiveness"].get("false_negative", 0) + 1
        else:
            results["exhaustion_effectiveness"]["true_negative"] = results["exhaustion_effectiveness"].get("true_negative", 0) + 1
    
    # Calculate precision/recall
    tp = results["exhaustion_effectiveness"].get("true_positive", 0)
    fp = results["exhaustion_effectiveness"].get("false_positive", 0)
    fn = results["exhaustion_effectiveness"].get("false_negative", 0)
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    results["metrics"] = {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4)
    }
    
    return {
        "status": "completed",
        "results": results
    }


def backtest_combined_linguistics(
    rounds: List[Dict[str, Any]],
    thresholds: Dict[str, float] = None
) -> Dict[str, Any]:
    """Backtest different linguistic factor combinations.
    
    Args:
        rounds: Historical rounds
        thresholds: Custom thresholds for release conditions
        
    Returns:
        Dictionary with linguistic combination backtest results
    """
    if thresholds is None:
        thresholds = {
            "pressure": 0.6,
            "compression": 0.5,
            "ceiling_proximity": 0.4,
            "momentum_distance": 0.3,
            "band_transition": 0.8
        }
    
    if not rounds or len(rounds) < 40:
        return {
            "status": "error",
            "error": "Insufficient data for linguistics backtest",
            "results": {}
        }
    
    from features.moonshot_scanner.linguistics import MoonshotLinguistics
    from features.pressure.calculator import PressureCalculator
    from features.pressure.detector import CeilingDetector
    
    linguistics = MoonshotLinguistics()
    pressure_calc = PressureCalculator()
    detector = CeilingDetector()
    
    multipliers = [r["multiplier"] for r in rounds]
    ceilings = detector.detect_resistance_ceilings([{"multiplier": m} for m in multipliers])
    
    # Find moonshot events
    moonshot_indices = [i for i, r in enumerate(rounds) if r["multiplier"] >= 20.0]
    
    results = {
        "combination_tests": {},
        "sweet_spot_accuracy": {},
        "total_moonshots": len(moonshot_indices)
    }
    
    # Test different threshold combinations
    threshold_variations = [
        {"name": "conservative", "multiplier": 0.8},
        {"name": "moderate", "multiplier": 1.0},
        {"name": "aggressive", "multiplier": 1.2}
    ]
    
    for variation in threshold_variations:
        adj_thresholds = {k: v * variation["multiplier"] for k, v in thresholds.items()}
        adj_thresholds = {k: min(1.0, v) for k, v in adj_thresholds.items()}
        
        true_positives = 0
        false_positives = 0
        false_negatives = 0
        
        for i in range(30, len(rounds) - 5):
            window_rounds = rounds[:i]
            
            # Calculate linguistics - pass ceilings to pressure calculator
            pressure_data = pressure_calc.compute_pressure(window_rounds[-20:], ceilings)
            ling_result = linguistics.compute_all_linguistics(window_rounds, pressure_data, ceilings, include_eta=False)
            
            # Test release conditions
            release_result = linguistics.compute_release_conditions(window_rounds, ling_result, adj_thresholds)
            
            # Check if moonshot occurs in next 5 rounds
            upcoming_moonshot = any(idx in range(i, min(i+5, len(rounds))) for idx in moonshot_indices)
            
            if release_result["all_conditions_met"]:
                if upcoming_moonshot:
                    true_positives += 1
                else:
                    false_positives += 1
            elif upcoming_moonshot:
                false_negatives += 1
        
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        results["combination_tests"][variation["name"]] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "true_positives": true_positives,
            "false_positives": false_positives,
            "false_negatives": false_negatives,
            "thresholds": adj_thresholds
        }
    
    # Find best configuration
    best_config = max(
        results["combination_tests"].items(),
        key=lambda x: x[1]["f1_score"]
    )
    
    results["best_configuration"] = {
        "name": best_config[0],
        "f1_score": best_config[1]["f1_score"],
        "thresholds": best_config[1]["thresholds"]
    }
    
    return {
        "status": "completed",
        "results": results
    }


def optimize_thresholds(
    rounds: List[Dict[str, Any]],
    metric: str = "f1",
    search_space: Dict[str, List[float]] = None
) -> Dict[str, Any]:
    """Grid search to find optimal thresholds for moonshot prediction.
    
    Args:
        rounds: Historical rounds
        metric: Metric to optimize (f1, precision, recall)
        search_space: Custom search space for thresholds
        
    Returns:
        Dictionary with optimization results
    """
    if search_space is None:
        search_space = {
            "pressure": [0.4, 0.5, 0.6, 0.7, 0.8],
            "compression": [0.3, 0.4, 0.5, 0.6, 0.7],
            "ceiling_proximity": [0.3, 0.4, 0.5, 0.6],
            "momentum_distance": [0.2, 0.3, 0.4, 0.5],
            "band_transition": [0.6, 0.7, 0.8, 0.9]
        }
    
    if not rounds or len(rounds) < 50:
        return {
            "status": "error",
            "error": "Insufficient data for threshold optimization",
            "results": {}
        }
    
    from features.moonshot_scanner.linguistics import MoonshotLinguistics
    from features.pressure.calculator import PressureCalculator
    from features.pressure.detector import CeilingDetector
    import itertools
    
    linguistics = MoonshotLinguistics()
    pressure_calc = PressureCalculator()
    detector = CeilingDetector()
    
    multipliers = [r["multiplier"] for r in rounds]
    ceilings = detector.detect_resistance_ceilings([{"multiplier": m} for m in multipliers])
    moonshot_indices = [i for i, r in enumerate(rounds) if r["multiplier"] >= 20.0]
    
    best_score = 0.0
    best_thresholds = None
    results = []
    
    # Generate all combinations
    keys = list(search_space.keys())
    values = list(search_space.values())
    
    for combination in itertools.product(*values):
        thresholds = dict(zip(keys, combination))
        
        # Test this combination
        true_positives = 0
        false_positives = 0
        false_negatives = 0
        
        for i in range(40, len(rounds) - 5):
            window_rounds = rounds[:i]
            pressure_data = pressure_calc.compute_pressure(window_rounds[-20:], ceilings)
            ling_result = linguistics.compute_all_linguistics(window_rounds, pressure_data, ceilings, include_eta=False)
            release_result = linguistics.compute_release_conditions(window_rounds, ling_result, thresholds)
            
            upcoming_moonshot = any(idx in range(i, min(i+5, len(rounds))) for idx in moonshot_indices)
            
            if release_result["all_conditions_met"]:
                if upcoming_moonshot:
                    true_positives += 1
                else:
                    false_positives += 1
            elif upcoming_moonshot:
                false_negatives += 1
        
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        score = f1 if metric == "f1" else (precision if metric == "precision" else recall)
        
        result = {
            "thresholds": thresholds,
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "score": score
        }
        results.append(result)
        
        if score > best_score:
            best_score = score
            best_thresholds = thresholds
    
    # Sort results by score
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "status": "completed",
        "best_thresholds": best_thresholds,
        "best_score": round(best_score, 4),
        "metric_optimized": metric,
        "top_results": results[:10],
        "total_combinations_tested": len(results)
    }
