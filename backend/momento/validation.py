"""Backtesting and validation framework for the AVFS forecast engine.

Walk-forward backtesting, proper scoring rules (Brier, log loss, ECE),
classification metrics, and calibration reporting — all computed from the
existing round history and persisted forecasts.  No external dependencies
beyond the Python standard library.
"""

from __future__ import annotations

import logging
import math
import statistics
from typing import Any, Dict, List, Optional, Sequence, Tuple

from . import db, store, forecast, analysis
from .config import AnalysisSettings, RuntimeToggles

logger = logging.getLogger("momento.validation")

Round = Dict[str, Any]


# ---------------------------------------------------------------------------
# baseline model
# ---------------------------------------------------------------------------

def baseline_forecast(multipliers: Sequence[float]) -> Dict[str, float]:
    """Simple percentile-based baseline: P(M >= x) from historical frequency.

    This is the model the forecast engine must beat.  It assumes the next
    round is an independent draw from the empirical distribution.

    Args:
        multipliers: Historical multiplier sequence (oldest first).

    Returns:
        Dict mapping threshold labels to their empirical exceedance
        probabilities.
    """
    total = len(multipliers)
    if total < 10:
        return {
            "p_over_1.5": 0.5,
            "p_over_2": 0.35,
            "p_over_3": 0.2,
            "p_over_5": 0.1,
            "p_over_10": 0.03,
        }

    return {
        "p_over_1.5": sum(1 for m in multipliers if m >= 1.5) / total,
        "p_over_2": sum(1 for m in multipliers if m >= 2.0) / total,
        "p_over_3": sum(1 for m in multipliers if m >= 3.0) / total,
        "p_over_5": sum(1 for m in multipliers if m >= 5.0) / total,
        "p_over_10": sum(1 for m in multipliers if m >= 10.0) / total,
    }


# ---------------------------------------------------------------------------
# scoring rules
# ---------------------------------------------------------------------------

def brier_score(probabilities: Sequence[float], outcomes: Sequence[int]) -> float:
    """Proper Brier score for binary events: BS = mean((p - o)^2).

    Lower is better.  A perfectly calibrated forecaster scores 0.

    Args:
        probabilities: Predicted probabilities in [0, 1].
        outcomes: Binary outcomes (0 or 1).

    Returns:
        Mean squared error of the probability forecasts, or 1.0 (worst
        case) when inputs are invalid.
    """
    if not probabilities or not outcomes or len(probabilities) != len(outcomes):
        return 1.0
    return statistics.fmean((p - o) ** 2 for p, o in zip(probabilities, outcomes))


def log_loss(probabilities: Sequence[float], outcomes: Sequence[int], epsilon: float = 1e-15) -> float:
    """Binary cross-entropy loss.

    Args:
        probabilities: Predicted probabilities in [0, 1].
        outcomes: Binary outcomes (0 or 1).
        epsilon: Clipping value to avoid log(0).

    Returns:
        Mean negative log-likelihood, or inf when inputs are empty.
    """
    if not probabilities or not outcomes:
        return float("inf")
    losses = []
    for p, o in zip(probabilities, outcomes):
        p_clipped = max(epsilon, min(1 - epsilon, p))
        loss = -(o * math.log(p_clipped) + (1 - o) * math.log(1 - p_clipped))
        losses.append(loss)
    return statistics.fmean(losses)


def expected_calibration_error(
    probabilities: Sequence[float],
    outcomes: Sequence[int],
    n_bins: int = 10,
) -> float:
    """Expected Calibration Error: weighted average of |accuracy - confidence| per bin.

    Args:
        probabilities: Predicted probabilities in [0, 1].
        outcomes: Binary outcomes (0 or 1).
        n_bins: Number of equal-width bins spanning [0, 1].

    Returns:
        ECE value in [0, 1], or 0.0 when inputs are empty.
    """
    if not probabilities:
        return 0.0

    bins: List[List[Tuple[float, int]]] = [[] for _ in range(n_bins)]
    for p, o in zip(probabilities, outcomes):
        bin_idx = min(int(p * n_bins), n_bins - 1)
        bins[bin_idx].append((p, o))

    ece = 0.0
    total = len(probabilities)
    for bin_data in bins:
        if not bin_data:
            continue
        bin_size = len(bin_data)
        avg_conf = statistics.fmean(p for p, _ in bin_data)
        avg_acc = statistics.fmean(o for _, o in bin_data)
        ece += (bin_size / total) * abs(avg_acc - avg_conf)

    return round(ece, 6)


# ---------------------------------------------------------------------------
# classification metrics
# ---------------------------------------------------------------------------

def classification_metrics(
    predicted_positive: Sequence[bool],
    actual_positive: Sequence[bool],
) -> Dict[str, float]:
    """Compute precision, recall, FPR, and F1 for binary classification.

    Args:
        predicted_positive: Whether the model predicted positive for each sample.
        actual_positive: Whether the sample is actually positive.

    Returns:
        Dict with precision, recall, false_positive_rate, f1_score, and
        raw confusion-matrix counts.
    """
    tp = sum(1 for p, a in zip(predicted_positive, actual_positive) if p and a)
    fp = sum(1 for p, a in zip(predicted_positive, actual_positive) if p and not a)
    fn = sum(1 for p, a in zip(predicted_positive, actual_positive) if not p and a)
    tn = sum(1 for p, a in zip(predicted_positive, actual_positive) if not p and not a)

    precision = tp / max(1, tp + fp)
    recall = tp / max(1, tp + fn)
    fpr = fp / max(1, fp + tn)
    f1 = 2 * precision * recall / max(0.001, precision + recall)

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "false_positive_rate": round(fpr, 4),
        "f1_score": round(f1, 4),
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "true_negatives": tn,
    }


# ---------------------------------------------------------------------------
# internal helpers
# ---------------------------------------------------------------------------

def _thresholds_and_keys() -> List[Tuple[str, float, str]]:
    """Threshold definitions used by both the engine and the baseline.

    Returns:
        List of (outcome_key, threshold, baseline_key) tuples.
    """
    return [
        ("over_1.5", 1.5, "p_over_1.5"),
        ("over_2", 2.0, "p_over_2"),
        ("over_3", 3.0, "p_over_3"),
        ("over_5", 5.0, "p_over_5"),
        ("over_10", 10.0, "p_over_10"),
    ]


def _engine_probabilities(
    fc: Dict[str, Any],
    baseline: Dict[str, float],
) -> Dict[str, float]:
    """Extract survival probabilities from the forecast engine output.

    The engine reports state-level candidates and ML predictions.  We
    derive P(M >= x) from the candidate probabilities whose ranges cover
    the threshold, falling back to the ML predictions if available.

    Args:
        fc: Forecast dict as returned by ``forecast.forecast()``.
        baseline: Baseline probabilities for fallback.

    Returns:
        Dict mapping threshold keys to probabilities.
    """
    candidates = fc.get("candidates", [])
    result: Dict[str, float] = {}

    for outcome_key, threshold, baseline_key in _thresholds_and_keys():
        prob = 0.0
        for c in candidates:
            if float(c.get("range_hi", 0)) >= threshold:
                prob += float(c.get("probability", 0.0))
        prob = min(1.0, max(0.0, prob))
        if prob == 0.0:
            prob = baseline.get(baseline_key, 0.1)
        result[baseline_key] = prob

    return result


def _score_thresholds(
    engine_probs: Dict[str, float],
    baseline_probs: Dict[str, float],
    actual: float,
) -> Tuple[Dict[str, int], Dict[str, int]]:
    """Compute binary outcomes for each threshold.

    Returns:
        (engine_outcomes, baseline_outcomes) dicts keyed like the
        probability dicts, with 1 if the actual multiplier meets or
        exceeds the threshold, 0 otherwise.
    """
    engine_out: Dict[str, int] = {}
    baseline_out: Dict[str, int] = {}
    for _, threshold, bkey in _thresholds_and_keys():
        hit = 1 if actual >= threshold else 0
        engine_out[bkey] = hit
        baseline_out[bkey] = hit
    return engine_out, baseline_out


# ---------------------------------------------------------------------------
# backtesting engine
# ---------------------------------------------------------------------------

def backtest(
    source: str,
    window_size: int = 200,
    step: int = 10,
    horizon: int = 1,
    min_history: int = 50,
) -> Dict[str, Any]:
    """Walk-forward backtest comparing the forecast engine against the baseline.

    At each step the engine and baseline generate a forecast from rounds
    strictly before the step position, then both are scored against the
    actual round at ``position + horizon``.

    Args:
        source: Data source identifier (e.g. ``"aviator"``).
        window_size: Maximum number of historical rounds fed to the
            engine at each step.
        step: Number of rounds to advance between evaluations.
        horizon: How many rounds ahead to predict (1 = next round).
        min_history: Minimum rounds required before the first evaluation.

    Returns:
        A comparison report with per-threshold Brier, log loss, ECE,
        classification metrics, and an overall verdict for both the
        engine and the baseline.
    """
    source = store.normalize_source(source)
    all_rounds = store.full_history(source)

    if len(all_rounds) < min_history + horizon:
        return {
            "source": source,
            "status": "insufficient_data",
            "rounds_available": len(all_rounds),
            "min_required": min_history + horizon,
            "engine": {},
            "baseline": {},
            "steps_evaluated": 0,
        }

    settings = store.analysis_settings()
    toggles = store.runtime_toggles()

    engine_probs_by_key: Dict[str, List[float]] = {bkey: [] for _, _, bkey in _thresholds_and_keys()}
    engine_outcomes_by_key: Dict[str, List[int]] = {bkey: [] for _, _, bkey in _thresholds_and_keys()}
    baseline_probs_by_key: Dict[str, List[float]] = {bkey: [] for _, _, bkey in _thresholds_and_keys()}
    baseline_outcomes_by_key: Dict[str, List[int]] = {bkey: [] for _, _, bkey in _thresholds_and_keys()}

    engine_predicted_pos: Dict[str, List[bool]] = {bkey: [] for _, _, bkey in _thresholds_and_keys()}
    baseline_predicted_pos: Dict[str, List[bool]] = {bkey: [] for _, _, bkey in _thresholds_and_keys()}
    actual_pos: Dict[str, List[bool]] = {bkey: [] for _, _, bkey in _thresholds_and_keys()}

    steps_evaluated = 0
    errors = 0

    start = min_history
    end = len(all_rounds) - horizon

    for pos in range(start, end, step):
        target_idx = pos + horizon
        if target_idx >= len(all_rounds):
            break

        history_window = all_rounds[max(0, pos - window_size):pos]
        if len(history_window) < 8:
            continue

        actual_round = all_rounds[target_idx]
        actual_mult = float(actual_round["multiplier"])

        multipliers_hist = [float(r["multiplier"]) for r in history_window]

        bl = baseline_forecast(multipliers_hist)

        try:
            analysis_payload = analysis.analyze(history_window, settings, toggles)
            fc = forecast.forecast(history_window, settings, analysis_payload)
        except Exception as exc:
            logger.debug("backtest step %d forecast failed: %s", pos, exc)
            errors += 1
            fc = {
                "candidates": [],
                "confidence": 0.0,
            }

        eng = _engine_probabilities(fc, bl)

        for _, threshold, bkey in _thresholds_and_keys():
            hit = 1 if actual_mult >= threshold else 0

            engine_probs_by_key[bkey].append(eng[bkey])
            engine_outcomes_by_key[bkey].append(hit)
            baseline_probs_by_key[bkey].append(bl[bkey])
            baseline_outcomes_by_key[bkey].append(hit)

            engine_predicted_pos[bkey].append(eng[bkey] >= 0.5)
            baseline_predicted_pos[bkey].append(bl[bkey] >= 0.5)
            actual_pos[bkey].append(actual_mult >= threshold)

        steps_evaluated += 1

    if steps_evaluated == 0:
        return {
            "source": source,
            "status": "no_evaluable_steps",
            "rounds_available": len(all_rounds),
            "engine": {},
            "baseline": {},
            "steps_evaluated": 0,
        }

    engine_report: Dict[str, Any] = {}
    baseline_report: Dict[str, Any] = {}

    all_engine_brier: List[float] = []
    all_baseline_brier: List[float] = []

    for outcome_key, threshold, bkey in _thresholds_and_keys():
        e_probs = engine_probs_by_key[bkey]
        e_outs = engine_outcomes_by_key[bkey]
        b_probs = baseline_probs_by_key[bkey]
        b_outs = baseline_outcomes_by_key[bkey]

        e_brier = brier_score(e_probs, e_outs)
        b_brier = brier_score(b_probs, b_outs)
        all_engine_brier.append(e_brier)
        all_baseline_brier.append(b_brier)

        e_cls = classification_metrics(engine_predicted_pos[bkey], actual_pos[bkey])
        b_cls = classification_metrics(baseline_predicted_pos[bkey], actual_pos[bkey])

        engine_report[outcome_key] = {
            "threshold": threshold,
            "brier_score": round(e_brier, 6),
            "log_loss": round(log_loss(e_probs, e_outs), 6),
            "ece": expected_calibration_error(e_probs, e_outs),
            "classification": e_cls,
            "mean_predicted_prob": round(statistics.fmean(e_probs), 4) if e_probs else 0.0,
            "actual_hit_rate": round(statistics.fmean(e_outs), 4) if e_outs else 0.0,
        }

        baseline_report[outcome_key] = {
            "threshold": threshold,
            "brier_score": round(b_brier, 6),
            "log_loss": round(log_loss(b_probs, b_outs), 6),
            "ece": expected_calibration_error(b_probs, b_outs),
            "classification": b_cls,
            "mean_predicted_prob": round(statistics.fmean(b_probs), 4) if b_probs else 0.0,
            "actual_hit_rate": round(statistics.fmean(b_outs), 4) if b_outs else 0.0,
        }

    engine_wins = sum(
        1 for e, b in zip(all_engine_brier, all_baseline_brier) if e < b
    )
    baseline_wins = sum(
        1 for e, b in zip(all_engine_brier, all_baseline_brier) if b < e
    )
    ties = len(all_engine_brier) - engine_wins - baseline_wins

    return {
        "source": source,
        "status": "complete",
        "rounds_available": len(all_rounds),
        "steps_evaluated": steps_evaluated,
        "forecast_errors": errors,
        "window_size": window_size,
        "step": step,
        "horizon": horizon,
        "min_history": min_history,
        "engine": engine_report,
        "baseline": baseline_report,
        "summary": {
            "engine_mean_brier": round(statistics.fmean(all_engine_brier), 6),
            "baseline_mean_brier": round(statistics.fmean(all_baseline_brier), 6),
            "engine_wins": engine_wins,
            "baseline_wins": baseline_wins,
            "ties": ties,
            "engine_better": engine_wins > baseline_wins,
        },
    }


# ---------------------------------------------------------------------------
# calibration report
# ---------------------------------------------------------------------------

def calibration_report(source: str, lookback: int = 500) -> Dict[str, Any]:
    """Generate a calibration reliability report from resolved forecasts.

    Queries persisted forecasts that have been scored against reality,
    bins them by predicted confidence, and computes observed hit frequency
    per bin.

    Args:
        source: Data source identifier.
        lookback: Maximum number of resolved forecasts to examine.

    Returns:
        Dict with per-bin calibration data, overall ECE, Brier score,
        and a summary verdict.
    """
    source = store.normalize_source(source)
    lookback = max(10, min(int(lookback), 5000))

    rows = db.query(
        """SELECT confidence, correct, predicted_state, range_lo, range_hi,
                  actual_multiplier, resolved_at
           FROM forecasts
           WHERE source = ? AND resolved = 1 AND correct IS NOT NULL
           ORDER BY resolved_at DESC LIMIT ?""",
        (source, lookback),
    )

    if not rows:
        return {
            "source": source,
            "status": "no_resolved_forecasts",
            "total_resolved": 0,
            "bins": [],
            "ece": 0.0,
            "brier_score": 1.0,
        }

    rows_list = db.rows_to_dicts(rows)
    total = len(rows_list)

    confidences = [float(r["confidence"]) for r in rows_list]
    outcomes = [int(r["correct"] or 0) for r in rows_list]

    overall_brier = brier_score(confidences, outcomes)
    overall_ece = expected_calibration_error(confidences, outcomes)

    n_bins = 10
    bin_data: List[List[Dict[str, Any]]] = [[] for _ in range(n_bins)]
    for row in rows_list:
        conf = float(row["confidence"])
        bin_idx = min(int(conf * n_bins), n_bins - 1)
        bin_data[bin_idx].append(row)

    bins_out: List[Dict[str, Any]] = []
    for idx, entries in enumerate(bin_data):
        lo = idx / n_bins
        hi = (idx + 1) / n_bins
        if not entries:
            bins_out.append({
                "bin": idx,
                "range_lo": round(lo, 2),
                "range_hi": round(hi, 2),
                "count": 0,
                "avg_confidence": round((lo + hi) / 2, 4),
                "observed_frequency": 0.0,
                "gap": 0.0,
            })
            continue

        bin_confs = [float(e["confidence"]) for e in entries]
        bin_outs = [int(e["correct"] or 0) for e in entries]
        avg_conf = statistics.fmean(bin_confs)
        obs_freq = statistics.fmean(bin_outs)

        bins_out.append({
            "bin": idx,
            "range_lo": round(lo, 2),
            "range_hi": round(hi, 2),
            "count": len(entries),
            "avg_confidence": round(avg_conf, 4),
            "observed_frequency": round(obs_freq, 4),
            "gap": round(abs(obs_freq - avg_conf), 4),
        })

    by_state: Dict[str, Dict[str, Any]] = {}
    for row in rows_list:
        state = str(row.get("predicted_state", "Unknown"))
        bucket = by_state.setdefault(state, {"total": 0, "hits": 0, "confs": [], "outs": []})
        bucket["total"] += 1
        bucket["hits"] += int(row["correct"] or 0)
        bucket["confs"].append(float(row["confidence"]))
        bucket["outs"].append(int(row["correct"] or 0))

    by_state_report: Dict[str, Any] = {}
    for state, data in by_state.items():
        by_state_report[state] = {
            "total": data["total"],
            "hits": data["hits"],
            "accuracy": round(data["hits"] / max(1, data["total"]), 4),
            "brier_score": round(brier_score(data["confs"], data["outs"]), 6),
            "mean_confidence": round(statistics.fmean(data["confs"]), 4),
        }

    return {
        "source": source,
        "status": "complete",
        "total_resolved": total,
        "bins": bins_out,
        "ece": overall_ece,
        "brier_score": round(overall_brier, 6),
        "by_state": by_state_report,
        "mean_confidence": round(statistics.fmean(confidences), 4),
        "overall_hit_rate": round(statistics.fmean(outcomes), 4),
        "calibration_grade": (
            "excellent" if overall_ece < 0.05
            else "good" if overall_ece < 0.10
            else "fair" if overall_ece < 0.20
            else "poor"
        ),
    }
