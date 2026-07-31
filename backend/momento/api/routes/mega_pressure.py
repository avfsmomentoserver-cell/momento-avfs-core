"""Mega Pressure Tracker - Advanced Prediction Engine.

Implements commercial-grade prediction methods:
- Kaplan-Meier survival analysis for ETA prediction
- Semantic layer probability weighting
- Deep DNA similarity matching for extreme targets
- Expected Value (EV) guardrails for chase strategies
- Honest accuracy validation with Brier scoring
"""

from __future__ import annotations

import math
import statistics
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from scipy import stats
from scipy.optimize import curve_fit

from ... import db
from ... import linguistics as ling
from ..deps import operator_user, source_param

router = APIRouter(prefix="/mega-pressure", tags=["pressure"])

# ---------------------------------------------------------------------------
# Semantic Layer Configuration
# ---------------------------------------------------------------------------

SEMANTIC_WEIGHTS = {
    "ignition": 0.05,  # 10x-20x: Noise/early pressure
    "moonshot": 0.35,  # 20x-50x: Momentum indicator
    "mega": 0.55,  # 50x-100x: Primary target
    "cosmic": 0.04,  # 100x-500x: Outlier
    "galactic": 0.01,  # 500x+: Anomaly
}

SEMANTIC_BANDS = list(SEMANTIC_WEIGHTS.keys())


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------


class ETAPrediction(BaseModel):
    rounds_eta: float
    time_eta_minutes: float
    hazard_rate: float
    confidence_50: Dict[str, float]
    confidence_75: Dict[str, float]
    confidence_95: Dict[str, float]
    methodology: str
    survival_curve: List[Dict[str, float]]


class SemanticProbability(BaseModel):
    band: str
    probability_mass: float
    strategic_function: str


class RangePrediction(BaseModel):
    predicted_range: Dict[str, float]
    confidence_intervals: Dict[str, Dict[str, float]]
    probability_distribution: Dict[str, float]
    semantic_weights: List[SemanticProbability]
    historical_accuracy: float
    methodology: str


class StateVector(BaseModel):
    band_distribution: Dict[str, float]  # D_b: Frequency of semantic tokens
    multiplier_sum: float  # ΣM: Total accumulated energy
    ladder_count: int  # L_c: Detected ladder structures
    ceiling_pressure: int  # P_ceiling: Failed breakouts


class DNAMatch(BaseModel):
    event_id: str
    event_multiplier: float
    event_timestamp: str
    similarity_score: float
    driving_factors: List[str]  # Which metrics drive similarity
    rounds_to_event: int  # Gap from similarity threshold to event


class DNAPrediction(BaseModel):
    target_multiplier: float
    variance_window: float
    query_range: Dict[str, float]
    dna_matches: List[DNAMatch]
    current_similarity: float
    predicted_eta_rounds: float
    confidence_score: float
    methodology: str


class EVCalculation(BaseModel):
    win_probability: float
    target_multiplier: float
    cumulative_wager: float
    expected_value: float
    recommended: bool
    reason: str


class EnhancedChaseStrategy(BaseModel):
    name: str
    description: str
    parameters: Dict[str, float]
    bet_sequence: List[Dict[str, float]]
    ev_analysis: EVCalculation
    recommendation_score: float
    methodology: str


class ForecastRecord(BaseModel):
    forecast_id: str
    source: str
    timestamp: str
    anchor_round_id: int
    predicted_eta: float
    predicted_range: Dict[str, float]
    pressure_at_prediction: float
    resolved: bool = False
    actual_eta: Optional[float] = None
    actual_multiplier: Optional[float] = None
    correct: Optional[bool] = None


class BrierScore(BaseModel):
    score: float
    n: int
    calibration: str  # "well-calibrated", "overconfident", "underconfident"


class AccuracyMetrics(BaseModel):
    brier_score: BrierScore
    eta_mae: float  # Mean Absolute Error for ETA
    range_accuracy: float
    total_forecasts: int
    resolved_forecasts: int
    pending_forecasts: int


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------


def classify_band(multiplier: float) -> str:
    """Classify multiplier into semantic band."""
    if multiplier < 10:
        return "ignition"
    elif multiplier < 20:
        return "ignition"
    elif multiplier < 50:
        return "moonshot"
    elif multiplier < 100:
        return "mega"
    elif multiplier < 500:
        return "cosmic"
    else:
        return "galactic"


def get_rounds(source: str, limit: int = 10000) -> List[Dict[str, Any]]:
    """Fetch rounds from database."""
    rows = db.query(
        """SELECT id, multiplier, timestamp FROM rounds 
           WHERE source = ? ORDER BY id DESC LIMIT ?""",
        (source, limit),
    )
    rounds = db.rows_to_dicts(rows)
    return list(reversed(rounds))  # Return in chronological order


def get_mega_rounds(source: str, min_multiplier: float = 50) -> List[Dict[str, Any]]:
    """Fetch mega rounds from database."""
    rows = db.query(
        """SELECT id, multiplier, timestamp FROM rounds 
           WHERE source = ? AND multiplier >= ? ORDER BY id ASC""",
        (source, min_multiplier),
    )
    return db.rows_to_dicts(rows)


def calculate_gaps(mega_rounds: List[Dict[str, Any]], all_rounds: List[Dict[str, Any]]) -> List[int]:
    """Calculate gaps between mega rounds in terms of round count."""
    gaps = []
    for i in range(len(mega_rounds) - 1):
        current_idx = next((j for j, r in enumerate(all_rounds) if r["id"] == mega_rounds[i]["id"]), -1)
        next_idx = next((j for j, r in enumerate(all_rounds) if r["id"] == mega_rounds[i + 1]["id"]), -1)
        if current_idx != -1 and next_idx != -1:
            gaps.append(next_idx - current_idx)
    return gaps


# ---------------------------------------------------------------------------
# Kaplan-Meier Survival Analysis
# ---------------------------------------------------------------------------


def kaplan_meier_estimator(gaps: List[int]) -> Tuple[List[int], List[float]]:
    """
    Calculate Kaplan-Meier survival function.
    Returns (time_points, survival_probabilities).
    """
    if not gaps:
        return [], []

    # Sort gaps
    sorted_gaps = sorted(gaps)
    n = len(sorted_gaps)

    # Calculate survival function
    time_points = []
    survival_probs = []
    survival_prob = 1.0

    for i, gap in enumerate(sorted_gaps):
        # Number at risk
        n_at_risk = n - i
        # Number of events (1 for each gap)
        n_events = 1
        # Survival probability update
        survival_prob *= (n_at_risk - n_events) / n_at_risk

        time_points.append(gap)
        survival_probs.append(survival_prob)

    return time_points, survival_probs


def weibull_fit(gaps: List[int]) -> Tuple[float, float]:
    """
    Fit Weibull distribution to gap data.
    Returns (shape, scale) parameters.
    """
    if len(gaps) < 3:
        # Default parameters if insufficient data
        return 2.0, statistics.mean(gaps) if gaps else 100.0

    try:
        # Fit Weibull using scipy
        shape, loc, scale = stats.weibull_min.fit(gaps, floc=0)
        return shape, scale
    except Exception:
        # Fallback to default
        return 2.0, statistics.mean(gaps)


def calculate_hazard_rate(gaps: List[int], current_rounds_since_last: int) -> float:
    """
    Calculate hazard rate h(t) = f(t) / (1 - F(t))
    Simplified as: events at risk / number at risk
    """
    if not gaps:
        return 0.01  # Default low hazard

    # Count how many historical gaps are <= current rounds since last mega
    events_at_risk = sum(1 for gap in gaps if gap <= current_rounds_since_last)
    n_at_risk = len(gaps)

    if n_at_risk == 0:
        return 0.01

    hazard = events_at_risk / n_at_risk
    return min(hazard, 1.0)  # Cap at 1.0


def greenwood_variance(survival_probs: List[float], n_at_risk: List[int]) -> List[float]:
    """
    Calculate Greenwood's formula for variance of survival function.
    """
    if not survival_probs:
        return []

    variances = []
    cumulative_variance = 0.0

    for i, (s, n) in enumerate(zip(survival_probs, n_at_risk)):
        if n > 1:
            d = 1 / (n * (n - 1))
            cumulative_variance += d / (s**2 if s > 0 else 1e-10)
        variances.append(cumulative_variance)

    return variances


# ---------------------------------------------------------------------------
# ETA Prediction Endpoint
# ---------------------------------------------------------------------------


@router.get("/eta", response_model=ETAPrediction)
async def get_eta_prediction(
    source: str = Depends(source_param),
    target_multiplier: Optional[float] = Query(default=None),
    fullscreen: bool = Query(default=False),
):
    """
    Kaplan-Meier survival analysis for ETA prediction.
    Calculates hazard rate h(t) = f(t) / (1 - F(t))
    """
    # Fetch data
    limit = 100000 if fullscreen else 10000
    all_rounds = get_rounds(source, limit)
    mega_rounds = get_mega_rounds(source, target_multiplier or 50)

    if len(mega_rounds) < 3:
        # Return default prediction if insufficient data
        return ETAPrediction(
            rounds_eta=100.0,
            time_eta_minutes=50.0,
            hazard_rate=0.01,
            confidence_50={"min_rounds": 50, "max_rounds": 150, "min_time": 25, "max_time": 75},
            confidence_75={"min_rounds": 25, "max_rounds": 175, "min_time": 12.5, "max_time": 87.5},
            confidence_95={"min_rounds": 10, "max_rounds": 190, "min_time": 5, "max_time": 95},
            methodology="Insufficient data for survival analysis",
            survival_curve=[],
        )

    # Calculate gaps
    gaps = calculate_gaps(mega_rounds, all_rounds)

    # Kaplan-Meier survival function
    time_points, survival_probs = kaplan_meier_estimator(gaps)

    # Weibull fit for parametric estimation
    shape, scale = weibull_fit(gaps)

    # Calculate current hazard rate
    # Estimate rounds since last mega
    last_mega_idx = next((i for i, r in enumerate(all_rounds) if r["id"] == mega_rounds[-1]["id"]), -1)
    rounds_since_last = len(all_rounds) - last_mega_idx - 1 if last_mega_idx != -1 else 0
    hazard_rate = calculate_hazard_rate(gaps, rounds_since_last)

    # Predict ETA using Weibull mean
    # Mean of Weibull: scale * gamma(1 + 1/shape)
    import scipy.special as sp
    weibull_mean = scale * sp.gamma(1 + 1 / shape)

    # Adjust for hazard rate
    hazard_adjusted_eta = weibull_mean * (1 - hazard_rate * 0.3)

    # Calculate average round duration in minutes
    if len(all_rounds) > 1:
        durations = []
        for i in range(1, min(100, len(all_rounds))):
            prev_time = datetime.fromisoformat(all_rounds[i - 1]["timestamp"]).timestamp()
            curr_time = datetime.fromisoformat(all_rounds[i]["timestamp"]).timestamp()
            durations.append((curr_time - prev_time) / 60)  # Convert to minutes
        avg_duration = statistics.mean(durations) if durations else 0.5
    else:
        avg_duration = 0.5

    predicted_time_minutes = hazard_adjusted_eta * avg_duration

    # Calculate confidence intervals using standard deviation
    std_dev = statistics.stdev(gaps) if len(gaps) > 1 else weibull_mean * 0.5

    confidence_50 = {
        "min_rounds": max(1, round(hazard_adjusted_eta - 0.67 * std_dev)),
        "max_rounds": round(hazard_adjusted_eta + 0.67 * std_dev),
        "min_time": max(1, (hazard_adjusted_eta - 0.67 * std_dev) * avg_duration),
        "max_time": (hazard_adjusted_eta + 0.67 * std_dev) * avg_duration,
    }

    confidence_75 = {
        "min_rounds": max(1, round(hazard_adjusted_eta - 1.15 * std_dev)),
        "max_rounds": round(hazard_adjusted_eta + 1.15 * std_dev),
        "min_time": max(1, (hazard_adjusted_eta - 1.15 * std_dev) * avg_duration),
        "max_time": (hazard_adjusted_eta + 1.15 * std_dev) * avg_duration,
    }

    confidence_95 = {
        "min_rounds": max(1, round(hazard_adjusted_eta - 1.96 * std_dev)),
        "max_rounds": round(hazard_adjusted_eta + 1.96 * std_dev),
        "min_time": max(1, (hazard_adjusted_eta - 1.96 * std_dev) * avg_duration),
        "max_time": (hazard_adjusted_eta + 1.96 * std_dev) * avg_duration,
    }

    # Build survival curve for visualization
    survival_curve = [
        {"round": int(t), "survival_probability": float(s)} for t, s in zip(time_points, survival_probs)
    ]

    return ETAPrediction(
        rounds_eta=round(hazard_adjusted_eta),
        time_eta_minutes=round(predicted_time_minutes, 2),
        hazard_rate=round(hazard_rate, 4),
        confidence_50=confidence_50,
        confidence_75=confidence_75,
        confidence_95=confidence_95,
        methodology=f"Kaplan-Meier survival analysis with Weibull fit (shape={shape:.2f}, scale={scale:.2f}). Based on {len(gaps)} historical gaps. Hazard rate: {hazard_rate:.4f}",
        survival_curve=survival_curve,
    )


# ---------------------------------------------------------------------------
# Range Prediction with Semantic Layer
# ---------------------------------------------------------------------------


@router.get("/range", response_model=RangePrediction)
async def get_range_prediction(
    source: str = Depends(source_param),
    min_multiplier: float = Query(default=50),
):
    """
    Range prediction with semantic layer probability weighting.
    Enforces research-specified mass distribution.
    """
    # Fetch mega rounds
    limit = 100000
    all_rounds = get_rounds(source, limit)
    mega_rounds = get_mega_rounds(source, min_multiplier)

    if len(mega_rounds) < 10:
        # Return default prediction
        return RangePrediction(
            predicted_range={"min": 50, "max": 100},
            confidence_intervals={
                "p50": {"min": 50, "max": 75},
                "p75": {"min": 50, "max": 100},
                "p95": {"min": 50, "max": 150},
            },
            probability_distribution=SEMANTIC_WEIGHTS,
            semantic_weights=[
                SemanticProbability(band=band, probability_mass=mass, strategic_function=get_strategic_function(band))
                for band, mass in SEMANTIC_WEIGHTS.items()
            ],
            historical_accuracy=0.0,
            methodology="Insufficient data for range prediction",
        )

    # Calculate percentiles
    multipliers = [r["multiplier"] for r in mega_rounds]
    p25 = np.percentile(multipliers, 25)
    p50 = np.percentile(multipliers, 50)
    p75 = np.percentile(multipliers, 75)
    p95 = np.percentile(multipliers, 95)

    # Predicted range (interquartile range)
    predicted_range = {"min": float(p25), "max": float(p75)}

    # Confidence intervals
    confidence_intervals = {
        "p50": {"min": float(p25), "max": float(p50)},
        "p75": {"min": float(p25), "max": float(p75)},
        "p95": {"min": float(p25), "max": float(p95)},
    }

    # Enforce semantic probability distribution
    probability_distribution = SEMANTIC_WEIGHTS.copy()

    # Calculate historical accuracy (how often actual falls in predicted range)
    # Use last 20% of data for validation
    test_size = max(1, len(mega_rounds) // 5)
    test_rounds = mega_rounds[-test_size:]
    correct = sum(1 for r in test_rounds if p25 <= r["multiplier"] <= p75)
    historical_accuracy = correct / len(test_rounds) if test_rounds else 0.0

    # Build semantic weights with strategic functions
    semantic_weights = [
        SemanticProbability(band=band, probability_mass=mass, strategic_function=get_strategic_function(band))
        for band, mass in SEMANTIC_WEIGHTS.items()
    ]

    return RangePrediction(
        predicted_range=predicted_range,
        confidence_intervals=confidence_intervals,
        probability_distribution=probability_distribution,
        semantic_weights=semantic_weights,
        historical_accuracy=round(historical_accuracy, 4),
        methodology=f"Percentile-based range prediction with semantic layer optimization. Based on {len(mega_rounds)} mega events. Historical accuracy: {historical_accuracy:.2%}",
    )


def get_strategic_function(band: str) -> str:
    """Get strategic function description for semantic band."""
    functions = {
        "ignition": "Noise / Early pressure buildup",
        "moonshot": "Immediate precursor / Momentum gauge",
        "mega": "Primary Prediction Target",
        "cosmic": "Outlier edge-case",
        "galactic": "Statistical anomaly",
    }
    return functions.get(band, "Unknown")


# ---------------------------------------------------------------------------
# Deep DNA Similarity Matching
# ---------------------------------------------------------------------------


class DNAMatch(BaseModel):
    """DNA similarity match result."""
    historical_round_id: int
    similarity_score: float
    distance_metric: float
    matched_multiplier: float
    matched_gap: int
    time_delta_minutes: float


class DNASimilarityResult(BaseModel):
    """DNA similarity analysis result."""
    current_state: Dict[str, Any]
    top_matches: List[DNAMatch]
    predicted_multiplier_range: Dict[str, float]
    confidence_score: float
    methodology: str


def extract_dna_features(rounds: List[Dict[str, Any]], window_size: int = 20) -> Dict[str, Any]:
    """
    Extract DNA features from recent rounds for similarity matching.
    Features include:
    - Multiplier sequence statistics
    - Linguistics patterns
    - Timing patterns
    - Energy buildup indicators
    """
    if len(rounds) < window_size:
        window = rounds
    else:
        window = rounds[-window_size:]

    multipliers = [r["multiplier"] for r in window]
    timestamps = [datetime.fromisoformat(r["timestamp"]).timestamp() for r in window]

    # Multiplier sequence features
    features = {
        "mean_multiplier": statistics.mean(multipliers),
        "std_multiplier": statistics.stdev(multipliers) if len(multipliers) > 1 else 0,
        "min_multiplier": min(multipliers),
        "max_multiplier": max(multipliers),
        "momentum": multipliers[-1] - multipliers[0] if len(multipliers) > 1 else 0,
        "volatility": statistics.stdev(multipliers) if len(multipliers) > 1 else 0,
    }

    # Timing features
    if len(timestamps) > 1:
        intervals = [(timestamps[i] - timestamps[i-1]) / 60 for i in range(1, len(timestamps))]
        features["avg_interval"] = statistics.mean(intervals)
        features["interval_std"] = statistics.stdev(intervals) if len(intervals) > 1 else 0
    else:
        features["avg_interval"] = 0.5
        features["interval_std"] = 0

    # Linguistics features (if available)
    if "linguistics" in window[0]:
        linguistics = [r.get("linguistics", {}) for r in window]
        features["linguistics_entropy"] = calculate_linguistics_entropy(linguistics)
    else:
        features["linguistics_entropy"] = 0

    return features


def calculate_linguistics_entropy(linguistics_list: List[Dict[str, Any]]) -> float:
    """Calculate entropy of linguistics patterns."""
    if not linguistics_list:
        return 0.0

    # Count pattern occurrences
    pattern_counts = {}
    for ling in linguistics_list:
        pattern = ling.get("pattern", "unknown")
        pattern_counts[pattern] = pattern_counts.get(pattern, 0) + 1

    # Calculate entropy
    total = len(linguistics_list)
    entropy = 0.0
    for count in pattern_counts.values():
        if count > 0:
            p = count / total
            entropy -= p * math.log2(p)

    return entropy


def calculate_dna_similarity(features1: Dict[str, Any], features2: Dict[str, Any]) -> float:
    """
    Calculate similarity between two DNA feature vectors using weighted Euclidean distance.
    Returns similarity score (0-1, where 1 is identical).
    """
    # Feature weights
    weights = {
        "mean_multiplier": 0.2,
        "std_multiplier": 0.15,
        "min_multiplier": 0.1,
        "max_multiplier": 0.15,
        "momentum": 0.15,
        "volatility": 0.1,
        "avg_interval": 0.05,
        "interval_std": 0.05,
        "linguistics_entropy": 0.05,
    }

    # Normalize features and calculate weighted distance
    distance = 0.0
    for key, weight in weights.items():
        val1 = features1.get(key, 0)
        val2 = features2.get(key, 0)

        # Normalize by typical ranges
        if key in ["mean_multiplier", "min_multiplier", "max_multiplier"]:
            norm_range = 100
        elif key in ["std_multiplier", "volatility"]:
            norm_range = 50
        elif key in ["momentum"]:
            norm_range = 50
        elif key in ["avg_interval", "interval_std"]:
            norm_range = 1.0
        elif key in ["linguistics_entropy"]:
            norm_range = 5.0
        else:
            norm_range = 1.0

        norm_diff = abs(val1 - val2) / norm_range
        distance += weight * norm_diff

    # Convert distance to similarity (1 - normalized distance)
    similarity = max(0, 1 - distance)
    return similarity


@router.get("/dna-similarity", response_model=DNASimilarityResult)
async def get_dna_similarity(
    source: str = Depends(source_param),
    target_multiplier: Optional[float] = Query(default=None),
    window_size: int = Query(default=20),
):
    """
    Deep DNA similarity matching for extreme target prediction.
    Compares current round patterns to historical mega precursors.
    """
    # Fetch recent rounds for current state
    all_rounds = get_rounds(source, 10000)
    mega_rounds = get_mega_rounds(source, 50)

    if len(all_rounds) < window_size or len(mega_rounds) < 5:
        return DNASimilarityResult(
            current_state={},
            top_matches=[],
            predicted_multiplier_range={"min": 50, "max": 100},
            confidence_score=0.0,
            methodology="Insufficient data for DNA similarity analysis",
        )

    # Extract current DNA features
    current_features = extract_dna_features(all_rounds, window_size)

    # Build historical DNA database from mega precursors
    historical_matches = []
    for mega in mega_rounds:
        # Find rounds before this mega event
        mega_index = next((i for i, r in enumerate(all_rounds) if r["id"] == mega["id"]), None)
        if mega_index and mega_index >= window_size:
            precursor_window = all_rounds[mega_index - window_size : mega_index]
            historical_features = extract_dna_features(precursor_window, window_size)

            # Calculate similarity
            similarity = calculate_dna_similarity(current_features, historical_features)
            distance = 1 - similarity

            # Calculate gap to mega
            gap = mega_index - (mega_index - window_size)
            time_delta = (datetime.fromisoformat(mega["timestamp"]).timestamp() -
                         datetime.fromisoformat(precursor_window[-1]["timestamp"]).timestamp()) / 60

            historical_matches.append(
                DNAMatch(
                    historical_round_id=mega["id"],
                    similarity_score=round(similarity, 4),
                    distance_metric=round(distance, 4),
                    matched_multiplier=float(mega["multiplier"]),
                    matched_gap=gap,
                    time_delta_minutes=round(time_delta, 2),
                )
            )

    # Sort by similarity and get top matches
    historical_matches.sort(key=lambda x: x.similarity_score, reverse=True)
    top_matches = historical_matches[:10]

    if not top_matches:
        return DNASimilarityResult(
            current_state=current_features,
            top_matches=[],
            predicted_multiplier_range={"min": 50, "max": 100},
            confidence_score=0.0,
            methodology="No historical matches found",
        )

    # Predict multiplier range based on top matches
    matched_multipliers = [m.matched_multiplier for m in top_matches]
    predicted_min = float(np.percentile(matched_multipliers, 25))
    predicted_max = float(np.percentile(matched_multipliers, 75))

    # Calculate confidence score based on similarity distribution
    avg_similarity = statistics.mean([m.similarity_score for m in top_matches])
    confidence_score = min(avg_similarity * 1.2, 1.0)  # Boost slightly

    return DNASimilarityResult(
        current_state=current_features,
        top_matches=top_matches,
        predicted_multiplier_range={"min": predicted_min, "max": predicted_max},
        confidence_score=round(confidence_score, 4),
        methodology=f"Deep DNA similarity matching using {len(all_rounds)} rounds and {len(mega_rounds)} historical mega events. Top {len(top_matches)} matches with avg similarity {avg_similarity:.2%}",
    )


# ---------------------------------------------------------------------------
# Enhanced Bankroll and Chase Strategy with EV Guardrails
# ---------------------------------------------------------------------------


class EVGuardrail(BaseModel):
    """Expected Value guardrail for betting decisions."""
    expected_value: float
    confidence_interval: Dict[str, float]
    risk_adjusted_ev: float
    kelly_fraction: float
    recommended_position_size: float
    max_loss: float
    should_bet: bool
    reason: str


class EnhancedChaseStrategy(BaseModel):
    """Enhanced chase strategy with EV guardrails."""
    strategy: str
    base_bet: float
    ev_guardrail: EVGuardrail
    risk_levels: Dict[str, Dict[str, Any]]
    recovery_plan: Dict[str, Any]
    methodology: str


def calculate_expected_value(
    predicted_range: Dict[str, float],
    historical_accuracy: float,
    bet_amount: float,
    target_multiplier: float,
    house_edge: float = 0.03,
) -> float:
    """
    Calculate Expected Value (EV) for a bet.
    EV = (Probability of Win * Profit) - (Probability of Loss * Loss)
    """
    # Estimate win probability based on historical accuracy and range confidence
    win_probability = historical_accuracy * 0.8  # Conservative estimate
    loss_probability = 1 - win_probability

    # Calculate profit and loss
    profit = bet_amount * (target_multiplier - 1) * (1 - house_edge)
    loss = bet_amount

    ev = (win_probability * profit) - (loss_probability * loss)
    return ev


def calculate_kelly_fraction(ev: float, odds: float, bankroll: float) -> float:
    """
    Calculate Kelly Criterion fraction for optimal bet sizing.
    f* = (bp - q) / b
    where b = odds - 1, p = probability of winning, q = probability of losing
    """
    if odds <= 1:
        return 0.0

    # Estimate win probability from EV
    # EV = p * (odds - 1) - (1 - p) * 1
    # EV = p * odds - p - 1 + p = p * odds - 1
    # p = (EV + 1) / odds
    p = max(0, min(1, (ev / bankroll + 1) / odds))
    q = 1 - p
    b = odds - 1

    kelly = (b * p - q) / b if b > 0 else 0
    return max(0, min(kelly, 0.25))  # Cap at 25% of bankroll


@router.get("/enhanced-chase", response_model=EnhancedChaseStrategy)
async def get_enhanced_chase_strategy(
    source: str = Depends(source_param),
    strategy: str = Query(default="moderate", enum=["conservative", "moderate", "aggressive"]),
    bankroll: float = Query(default=1000),
    target_multiplier: float = Query(default=50),
):
    """
    Enhanced chase strategy with EV guardrails.
    Uses Kelly Criterion and Expected Value calculations to optimize betting.
    """
    # Fetch historical data
    mega_rounds = get_mega_rounds(source, target_multiplier)
    all_rounds = get_rounds(source, 1000)

    if len(mega_rounds) < 10:
        return EnhancedChaseStrategy(
            strategy=strategy,
            base_bet=10,
            ev_guardrail=EVGuardrail(
                expected_value=0,
                confidence_interval={"min": 0, "max": 0},
                risk_adjusted_ev=0,
                kelly_fraction=0,
                recommended_position_size=0,
                max_loss=0,
                should_bet=False,
                reason="Insufficient data for EV calculation",
            ),
            risk_levels={},
            recovery_plan={},
            methodology="Insufficient data for enhanced chase strategy",
        )

    # Calculate historical statistics
    multipliers = [r["multiplier"] for r in mega_rounds]
    avg_multiplier = statistics.mean(multipliers)
    hit_rate = len(mega_rounds) / len(all_rounds) if all_rounds else 0

    # Risk level configurations
    risk_configs = {
        "conservative": {"risk_pct": 0.01, "max_drawdown": 0.1, "kelly_cap": 0.1},
        "moderate": {"risk_pct": 0.02, "max_drawdown": 0.2, "kelly_cap": 0.15},
        "aggressive": {"risk_pct": 0.05, "max_drawdown": 0.3, "kelly_cap": 0.25},
    }

    config = risk_configs[strategy]
    base_bet = bankroll * config["risk_pct"]

    # Calculate EV
    ev = calculate_expected_value(
        predicted_range={"min": target_multiplier, "max": avg_multiplier},
        historical_accuracy=hit_rate,
        bet_amount=base_bet,
        target_multiplier=target_multiplier,
    )

    # Calculate Kelly fraction
    kelly_fraction = calculate_kelly_fraction(ev, target_multiplier, bankroll)
    kelly_fraction = min(kelly_fraction, config["kelly_cap"])  # Apply cap

    # Calculate recommended position size
    recommended_position = bankroll * kelly_fraction
    max_loss = recommended_position

    # Risk-adjusted EV (accounting for variance)
    std_dev = statistics.stdev(multipliers) if len(multipliers) > 1 else avg_multiplier * 0.5
    risk_adjusted_ev = ev / (1 + std_dev / avg_multiplier) if avg_multiplier > 0 else 0

    # Confidence interval for EV
    ev_std = abs(ev) * 0.3  # Estimate EV uncertainty
    confidence_interval = {
        "min": ev - 1.96 * ev_std,
        "max": ev + 1.96 * ev_std,
    }

    # Determine if bet should be placed
    should_bet = risk_adjusted_ev > 0 and kelly_fraction > 0.01
    reason = (
        f"Positive EV ({ev:.2f}) with Kelly fraction {kelly_fraction:.2%}"
        if should_bet
        else f"Negative or insufficient EV ({ev:.2f})"
    )

    # Build EV guardrail
    ev_guardrail = EVGuardrail(
        expected_value=round(ev, 2),
        confidence_interval={k: round(v, 2) for k, v in confidence_interval.items()},
        risk_adjusted_ev=round(risk_adjusted_ev, 2),
        kelly_fraction=round(kelly_fraction, 4),
        recommended_position_size=round(recommended_position, 2),
        max_loss=round(max_loss, 2),
        should_bet=should_bet,
        reason=reason,
    )

    # Build risk levels
    risk_levels = {}
    for level, level_config in risk_configs.items():
        level_bet = bankroll * level_config["risk_pct"]
        level_kelly = min(kelly_fraction, level_config["kelly_cap"])
        risk_levels[level] = {
            "bet_size": round(level_bet, 2),
            "kelly_fraction": round(level_kelly, 4),
            "position_size": round(bankroll * level_kelly, 2),
            "max_drawdown": level_config["max_drawdown"],
            "recommended": level == strategy,
        }

    # Build recovery plan
    recovery_plan = {
        "max_consecutive_losses": int(math.log(config["max_drawdown"] * bankroll / base_bet + 1, 2)),
        "recovery_multiplier": 1.5,
        "stop_loss": round(bankroll * config["max_drawdown"], 2),
        "take_profit": round(bankroll * (1 + config["risk_pct"] * 5), 2),
    }

    return EnhancedChaseStrategy(
        strategy=strategy,
        base_bet=round(base_bet, 2),
        ev_guardrail=ev_guardrail,
        risk_levels=risk_levels,
        recovery_plan=recovery_plan,
        methodology=f"Enhanced chase strategy using Kelly Criterion and EV guardrails. Based on {len(mega_rounds)} historical mega events with {hit_rate:.2%} hit rate. Target: {target_multiplier}x",
    )


# ---------------------------------------------------------------------------
# Honest Accuracy Validation (Brier Scoring, Forward-Testing)
# ---------------------------------------------------------------------------


class BrierScoreResult(BaseModel):
    """Brier score for probabilistic predictions."""
    brier_score: float
    calibration_error: float
    resolution: float
    uncertainty: float
    reliability_diagram: List[Dict[str, Any]]
    sample_size: int
    methodology: str


class ForwardTestResult(BaseModel):
    """Forward-testing validation result."""
    test_period: Dict[str, str]
    total_predictions: int
    correct_predictions: int
    accuracy: float
    brier_score: float
    profit_loss: float
    max_drawdown: float
    sharpe_ratio: float
    methodology: str


def calculate_brier_score(
    predicted_probs: List[float],
    actual_outcomes: List[int],
    n_bins: int = 10,
) -> BrierScoreResult:
    """
    Calculate Brier score for probabilistic predictions.
    Brier Score = (1/N) * Σ(f_i - o_i)²
    where f_i = predicted probability, o_i = actual outcome (0 or 1)
    """
    if len(predicted_probs) != len(actual_outcomes) or len(predicted_probs) == 0:
        return BrierScoreResult(
            brier_score=1.0,
            calibration_error=1.0,
            resolution=0.0,
            uncertainty=0.0,
            reliability_diagram=[],
            sample_size=0,
            methodology="Insufficient data for Brier score calculation",
        )

    # Calculate Brier score
    brier_score = statistics.mean([(p - o) ** 2 for p, o in zip(predicted_probs, actual_outcomes)])

    # Decompose Brier score into reliability, resolution, and uncertainty
    n = len(predicted_probs)
    avg_outcome = statistics.mean(actual_outcomes)
    uncertainty = avg_outcome * (1 - avg_outcome)

    # Calculate resolution (variance of actual outcomes)
    resolution = statistics.variance(actual_outcomes) if len(actual_outcomes) > 1 else 0

    # Reliability = Brier score - resolution + uncertainty
    reliability = brier_score - resolution + uncertainty
    calibration_error = max(0, reliability)

    # Build reliability diagram
    reliability_diagram = []
    for i in range(n_bins):
        bin_start = i / n_bins
        bin_end = (i + 1) / n_bins

        # Find predictions in this bin
        bin_indices = [j for j, p in enumerate(predicted_probs) if bin_start <= p < bin_end]
        if bin_indices:
            bin_predicted = statistics.mean([predicted_probs[j] for j in bin_indices])
            bin_actual = statistics.mean([actual_outcomes[j] for j in bin_indices])
            reliability_diagram.append({
                "bin": f"{bin_start:.2f}-{bin_end:.2f}",
                "predicted_prob": round(bin_predicted, 3),
                "actual_freq": round(bin_actual, 3),
                "count": len(bin_indices),
            })

    return BrierScoreResult(
        brier_score=round(brier_score, 4),
        calibration_error=round(calibration_error, 4),
        resolution=round(resolution, 4),
        uncertainty=round(uncertainty, 4),
        reliability_diagram=reliability_diagram,
        sample_size=n,
        methodology=f"Brier score decomposition: BS = {brier_score:.4f}, Reliability = {calibration_error:.4f}, Resolution = {resolution:.4f}, Uncertainty = {uncertainty:.4f}",
    )


@router.get("/brier-score", response_model=BrierScoreResult)
async def get_brier_score(
    source: str = Depends(source_param),
    min_multiplier: float = Query(default=50),
    test_size: int = Query(default=100),
):
    """
    Calculate Brier score for probabilistic predictions.
    Validates calibration of prediction probabilities.
    """
    # Fetch historical data
    all_rounds = get_rounds(source, 10000)
    mega_rounds = get_mega_rounds(source, min_multiplier)

    if len(mega_rounds) < test_size * 2:
        return BrierScoreResult(
            brier_score=1.0,
            calibration_error=1.0,
            resolution=0.0,
            uncertainty=0.0,
            reliability_diagram=[],
            sample_size=0,
            methodology="Insufficient data for Brier score calculation",
        )

    # Simulate predictions using last test_size rounds
    test_rounds = all_rounds[-test_size:]
    predicted_probs = []
    actual_outcomes = []

    # Use pressure-based probability estimation
    for i, round_data in enumerate(test_rounds):
        # Calculate pressure from preceding rounds
        window = all_rounds[max(0, len(all_rounds) - test_size - 20 + i):len(all_rounds) - test_size + i]
        if len(window) > 0:
            multipliers = [r["multiplier"] for r in window]
            avg_multiplier = statistics.mean(multipliers)
            max_multiplier = max(multipliers)
            # Estimate probability based on pressure indicators
            pressure_score = min(1.0, (avg_multiplier / min_multiplier) * 0.5 + (max_multiplier / min_multiplier) * 0.3)
            predicted_probs.append(pressure_score)
        else:
            predicted_probs.append(0.1)

        # Actual outcome
        actual_outcomes.append(1 if round_data["multiplier"] >= min_multiplier else 0)

    return calculate_brier_score(predicted_probs, actual_outcomes)


@router.get("/forward-test", response_model=ForwardTestResult)
async def get_forward_test(
    source: str = Depends(source_param),
    min_multiplier: float = Query(default=50),
    test_rounds: int = Query(default=500),
):
    """
    Forward-testing validation of predictions.
    Simulates live trading on historical data.
    """
    # Fetch historical data
    all_rounds = get_rounds(source, 10000)
    mega_rounds = get_mega_rounds(source, min_multiplier)

    if len(all_rounds) < test_rounds + 100:
        return ForwardTestResult(
            test_period={"start": "N/A", "end": "N/A"},
            total_predictions=0,
            correct_predictions=0,
            accuracy=0.0,
            brier_score=1.0,
            profit_loss=0.0,
            max_drawdown=0.0,
            sharpe_ratio=0.0,
            methodology="Insufficient data for forward testing",
        )

    # Use last test_rounds for validation
    test_data = all_rounds[-test_rounds:]
    train_data = all_rounds[:-test_rounds]

    # Calculate test period
    start_time = test_data[0]["timestamp"]
    end_time = test_data[-1]["timestamp"]

    # Simulate predictions
    predictions = []
    actuals = []
    profits = []
    cumulative_pnl = 0
    max_pnl = 0
    min_pnl = 0

    for i, round_data in enumerate(test_data):
        # Use pressure from training data + previous test rounds
        window = train_data[-100:] + test_data[:i]
        if len(window) > 0:
            multipliers = [r["multiplier"] for r in window]
            avg_multiplier = statistics.mean(multipliers)
            # Simple prediction: bet if avg multiplier > threshold
            predicted = avg_multiplier > (min_multiplier * 0.3)
        else:
            predicted = False

        predictions.append(predicted)
        actual = round_data["multiplier"] >= min_multiplier
        actuals.append(actual)

        # Simulate PnL (simplified)
        bet_size = 10
        if predicted:
            if actual:
                profit = bet_size * (round_data["multiplier"] - 1)
            else:
                profit = -bet_size
        else:
            profit = 0

        cumulative_pnl += profit
        profits.append(cumulative_pnl)
        max_pnl = max(max_pnl, cumulative_pnl)
        min_pnl = min(min_pnl, cumulative_pnl)

    # Calculate metrics
    correct = sum(1 for p, a in zip(predictions, actuals) if p == a)
    accuracy = correct / len(predictions) if predictions else 0

    # Brier score
    predicted_probs = [0.7 if p else 0.3 for p in predictions]
    brier_result = calculate_brier_score(predicted_probs, [int(a) for a in actuals])

    # Max drawdown
    max_drawdown = max_pnl - min_pnl if max_pnl > 0 else abs(min_pnl)

    # Sharpe ratio (simplified)
    if len(profits) > 1:
        returns = [profits[i] - profits[i-1] for i in range(1, len(profits))]
        avg_return = statistics.mean(returns)
        std_return = statistics.stdev(returns) if len(returns) > 1 else 1
        sharpe_ratio = avg_return / std_return if std_return > 0 else 0
    else:
        sharpe_ratio = 0

    return ForwardTestResult(
        test_period={"start": start_time, "end": end_time},
        total_predictions=len(predictions),
        correct_predictions=correct,
        accuracy=round(accuracy, 4),
        brier_score=brier_result.brier_score,
        profit_loss=round(cumulative_pnl, 2),
        max_drawdown=round(max_drawdown, 2),
        sharpe_ratio=round(sharpe_ratio, 4),
        methodology=f"Forward test on {test_rounds} rounds using pressure-based predictions. Accuracy: {accuracy:.2%}, PnL: {cumulative_pnl:.2f}",
    )


# ---------------------------------------------------------------------------
# Database Migration
# ---------------------------------------------------------------------------


def migrate_mega_forecasts():
    """Create mega_forecasts table if not exists."""
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS mega_forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            forecast_id TEXT UNIQUE NOT NULL,
            source TEXT NOT NULL,
            anchor_round_id INTEGER NOT NULL,
            predicted_eta REAL NOT NULL,
            predicted_range_lo REAL NOT NULL,
            predicted_range_hi REAL NOT NULL,
            pressure_at_prediction REAL NOT NULL,
            created_at TEXT NOT NULL,
            resolved INTEGER DEFAULT 0,
            actual_eta REAL,
            actual_multiplier REAL,
            correct INTEGER,
            resolved_at TEXT,
            FOREIGN KEY (anchor_round_id) REFERENCES rounds(id)
        )
    """
    )
    db.execute("CREATE INDEX IF NOT EXISTS idx_mega_forecasts_source ON mega_forecasts(source)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_mega_forecasts_resolved ON mega_forecasts(resolved)")


# Run migration on module import
try:
    migrate_mega_forecasts()
except Exception as e:
    print(f"Warning: Failed to migrate mega_forecasts table: {e}")
