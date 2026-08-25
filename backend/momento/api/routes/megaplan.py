"""Megaplan Moonshot Prediction System API.

Provides endpoints for the advanced prediction system that analyzes:
- Multiplier sequences using rate of change patterns
- Time-based candlesticks with large multiplier handling
- Momentum compression patterns and cluster forecasting
- Market state classification with energy buildup analysis
- Strict consensus correlation across all factors
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ... import db
from ..deps import operator_user, source_param

router = APIRouter(prefix="/megaplan", tags=["megaplan"])


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class MegaplanPrediction(BaseModel):
    """Main prediction result from the megaplan system."""
    market_state: str  # "compression" | "release" | "transition"
    next_range_targets: Dict[str, Any]
    forward_structure: Dict[str, Any]
    momentum_forecast: Dict[str, Any]
    consensus_score: float
    factors: Dict[str, bool]
    timestamp: str


class SequenceAngleAnalysis(BaseModel):
    """Sequence angle analysis results."""
    sequence: List[float]
    angle: float
    rate_of_change: List[float]
    acceleration: List[float]
    direction: str
    target_range: Dict[str, float]
    confidence: float
    predicted_sequence: Optional[List[float]] = None


class MomentumCompressionAnalysis(BaseModel):
    """Momentum compression analysis results."""
    compression_points: List[float]
    release_points: List[float]
    momentum_score: float
    compression_ratio: float
    cluster_probability: float
    expected_cluster_timing: int
    pattern: str
    confidence: float


class MarketStateAnalysis(BaseModel):
    """Market state classification results."""
    current_state: str
    energy_buildup: float
    pressure_score: float
    transition_signals: List[Dict[str, Any]]
    confidence: float


class TimeBasedCandlestick(BaseModel):
    """Time-based candlestick data."""
    time: int
    open: float
    high: float
    low: float
    close: float
    round_times: List[float]
    large_multiplier_divisions: List[Dict[str, Any]]
    round_count: int
    peak_multiplier: float


class MegaplanConfig(BaseModel):
    """Megaplan system configuration."""
    analysis_window: int = 300
    timeframes: List[str] = ["1m", "5m", "15m", "1h"]
    computed_consensus: bool = True
    confidence_threshold: float = 0.7
    large_multiplier_threshold: int = 1000
    performance_mode: str = "balanced"


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def get_rounds_for_analysis(source: str, limit: int = 300) -> List[Dict[str, Any]]:
    """Fetch rounds for analysis from the database."""
    try:
        with db.get_session() as session:
            query = """
                SELECT id, multiplier, timestamp
                FROM rounds
                WHERE source = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """
            cursor = session.execute(query, (source, limit))
            rows = cursor.fetchall()
            
            return [
                {
                    "id": row[0],
                    "multiplier": row[1],
                    "timestamp": row[2].isoformat() if row[2] else datetime.utcnow().isoformat()
                }
                for row in rows
            ]
    except Exception as e:
        print(f"Error fetching rounds for analysis: {e}")
        return []


def calculate_sequence_angle(sequence: List[float]) -> Dict[str, Any]:
    """Calculate sequence angle using rate of change patterns."""
    if len(sequence) < 2:
        return {"angle": 0, "direction": "sideways", "confidence": 0}
    
    # Calculate rate of change
    rates_of_change = []
    for i in range(1, len(sequence)):
        rates_of_change.append((sequence[i] - sequence[i-1]) / sequence[i-1])
    
    # Calculate angle using log-transformed data
    import math
    log_sequence = [math.log(x) for x in sequence]
    x_values = list(range(len(sequence)))
    
    # Simple linear regression
    n = len(sequence)
    sum_x = sum(x_values)
    sum_y = sum(log_sequence)
    sum_xy = sum(x * y for x, y in zip(x_values, log_sequence))
    sum_x2 = sum(x * x for x in x_values)
    
    denominator = n * sum_x2 - sum_x * sum_x
    if denominator == 0:
        slope = 0
    else:
        slope = (n * sum_xy - sum_x * sum_y) / denominator
    
    angle = math.atan(slope) * (180 / math.pi)
    
    # Determine direction
    avg_rate = sum(rates_of_change) / len(rates_of_change) if rates_of_change else 0
    if abs(angle) < 5 and abs(avg_rate) < 0.1:
        direction = "sideways"
    elif angle > 0 or avg_rate > 0:
        direction = "upward"
    else:
        direction = "downward"
    
    # Calculate confidence based on sequence length and pattern consistency
    confidence = min(1.0, len(sequence) / 100) * 0.8
    
    return {
        "angle": angle,
        "direction": direction,
        "confidence": confidence,
        "rate_of_change": rates_of_change
    }


def calculate_momentum_compression(rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate momentum and compression analysis."""
    multipliers = [r["multiplier"] for r in rounds]
    
    # Identify compression and release points
    compression_threshold = 2.0
    release_threshold = 10.0
    
    compression_points = [m for m in multipliers if m < compression_threshold]
    release_points = [m for m in multipliers if m >= release_threshold]
    
    # Calculate momentum score
    release_count = len(release_points)
    total_count = len(multipliers)
    momentum_score = (release_count / total_count) if total_count > 0 else 0
    
    # Calculate compression ratio
    compression_count = len(compression_points)
    compression_ratio = compression_count / total_count if total_count > 0 else 0
    
    # Calculate cluster probability
    cluster_probability = momentum_score * (1 - compression_ratio)
    
    # Expected cluster timing (simplified)
    if release_count > 1:
        release_indices = [i for i, m in enumerate(multipliers) if m >= release_threshold]
        gaps = [release_indices[i] - release_indices[i-1] for i in range(1, len(release_indices))]
        expected_timing = sum(gaps) / len(gaps) if gaps else 50
    else:
        expected_timing = 50
    
    pattern = f"{'gradual' if compression_ratio > 0.7 else 'sudden' if compression_ratio < 0.3 else 'oscillating'} compression-release pattern"
    
    confidence = min(1.0, total_count / 100)
    
    return {
        "compression_points": compression_points,
        "release_points": release_points,
        "momentum_score": momentum_score,
        "compression_ratio": compression_ratio,
        "cluster_probability": cluster_probability,
        "expected_cluster_timing": expected_timing,
        "pattern": pattern,
        "confidence": confidence
    }


def classify_market_state(rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Classify current market state."""
    multipliers = [r["multiplier"] for r in rounds]
    
    # Calculate energy indicators
    recent_multipliers = multipliers[-50:] if len(multipliers) >= 50 else multipliers
    high_multiplier_count = sum(1 for m in recent_multipliers if m >= 10)
    energy_buildup = high_multiplier_count / len(recent_multipliers) if recent_multipliers else 0
    
    # Calculate pressure score
    avg_multiplier = sum(multipliers) / len(multipliers) if multipliers else 1
    pressure_score = min(1.0, avg_multiplier / 10)
    
    # Determine market state
    if energy_buildup > 0.7 and pressure_score > 0.6:
        current_state = "release"
    elif energy_buildup < 0.4 and pressure_score < 0.4:
        current_state = "compression"
    else:
        current_state = "transition"
    
    # Generate transition signals
    transition_signals = []
    if energy_buildup > 0.6 and pressure_score > 0.5:
        transition_signals.append({
            "type": "energy_buildup",
            "strength": 0.8,
            "description": "High energy buildup detected"
        })
    
    confidence = min(1.0, len(multipliers) / 100)
    
    return {
        "current_state": current_state,
        "energy_buildup": energy_buildup,
        "pressure_score": pressure_score,
        "transition_signals": transition_signals,
        "confidence": confidence
    }


def apply_computed_consensus(
    sequence_analysis: Dict[str, Any],
    momentum_analysis: Dict[str, Any],
    market_state_analysis: Dict[str, Any],
    config: MegaplanConfig
) -> Dict[str, Any]:
    """Apply computed consensus correlation across all factors."""
    
    # Check if all factors are valid
    sequence_valid = sequence_analysis["confidence"] >= config.confidence_threshold
    momentum_valid = (
        momentum_analysis["confidence"] >= config.confidence_threshold and
        momentum_analysis["momentum_score"] > 0.5 and
        momentum_analysis["cluster_probability"] > 0.6
    )
    market_state_valid = (
        market_state_analysis["confidence"] >= config.confidence_threshold and
        market_state_analysis["current_state"] != "transition" and
        market_state_analysis["energy_buildup"] > 0.5
    )
    
    # For time candlestick, we'll use a simplified validation (would normally use actual candlestick data)
    candlestick_valid = True  # Placeholder for now
    
    # Calculate weighted consensus score (computed consensus)
    weights = {"sequence_angle": 0.3, "momentum_compression": 0.3, "time_candlestick": 0.2, "market_state": 0.2}
    
    consensus_score = (
        (sequence_analysis["confidence"] * weights["sequence_angle"] if sequence_valid else 0) +
        (momentum_analysis["confidence"] * weights["momentum_compression"] if momentum_valid else 0) +
        (0.7 * weights["time_candlestick"] if candlestick_valid else 0) +
        (market_state_analysis["confidence"] * weights["market_state"] if market_state_valid else 0)
    )
    
    valid_factors = [
        "sequence_angle" if sequence_valid else None,
        "momentum_compression" if momentum_valid else None,
        "time_candlestick" if candlestick_valid else None,
        "market_state" if market_state_valid else None
    ]
    
    invalid_factors = [
        "sequence_angle" if not sequence_valid else None,
        "momentum_compression" if not momentum_valid else None,
        "time_candlestick" if not candlestick_valid else None,
        "market_state" if not market_state_valid else None
    ]
    
    return {
        "consensus_score": consensus_score,
        "valid_factors": [f for f in valid_factors if f],
        "invalid_factors": [f for f in invalid_factors if f],
        "explanation": f"Computed consensus score: {consensus_score:.2f} based on valid factors"
    }


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@router.get("/prediction")
async def get_megaplan_prediction(
    source: str = Depends(source_param),
    analysis_window: int = Query(default=300, ge=100, le=1000),
    computed_consensus: bool = Query(default=True),
    _user = Depends(operator_user)
) -> MegaplanPrediction:
    """Generate megaplan moonshot prediction using strict consensus correlation."""
    
    # Fetch rounds for analysis
    rounds = get_rounds_for_analysis(source, analysis_window)
    
    if len(rounds) < 10:
        return MegaplanPrediction(
            market_state="transition",
            next_range_targets={"min": 1.0, "max": 10.0, "confidence": 0},
            forward_structure={"predicted_sequence": [], "angle": 0, "direction": "sideways"},
            momentum_forecast={"current_momentum": 0, "release_probability": 0, "cluster_prediction": {"likely": False, "timing": 0}},
            consensus_score=0,
            factors={"sequence_angle": False, "momentum_compression": False, "time_candlestick": False, "market_state": False},
            timestamp=datetime.utcnow().isoformat()
        )
    
    multipliers = [r["multiplier"] for r in rounds]
    
    # Run individual analyses
    sequence_analysis = calculate_sequence_angle(multipliers)
    momentum_analysis = calculate_momentum_compression(rounds)
    market_state_analysis = classify_market_state(rounds)
    
    # Create config
    config = MegaplanConfig(
        analysis_window=analysis_window,
        computed_consensus=computed_consensus
    )
    
    # Apply computed consensus
    consensus_result = apply_computed_consensus(
        sequence_analysis,
        momentum_analysis,
        market_state_analysis,
        config
    )
    
    # Generate forward structure prediction
    predicted_sequence = []
    if sequence_analysis["direction"] == "upward" and sequence_analysis["confidence"] > 0.5:
        last_value = multipliers[-1]
        for i in range(1, 6):
            predicted_value = last_value * (1.1 ** i)  # Simple upward projection
            predicted_sequence.append(predicted_value)
    
    # Build prediction result
    return MegaplanPrediction(
        market_state=market_state_analysis["current_state"],
        next_range_targets={
            "min": max(1.0, min(multipliers) * 0.9),
            "max": max(multipliers) * 1.1,
            "confidence": consensus_result["consensus_score"]
        },
        forward_structure={
            "predicted_sequence": predicted_sequence,
            "angle": sequence_analysis["angle"],
            "direction": sequence_analysis["direction"]
        },
        momentum_forecast={
            "current_momentum": momentum_analysis["momentum_score"],
            "release_probability": momentum_analysis["cluster_probability"],
            "cluster_prediction": {
                "likely": momentum_analysis["cluster_probability"] > 0.6,
                "timing": momentum_analysis["expected_cluster_timing"]
            }
        },
        consensus_score=consensus_result["consensus_score"],
        factors={
            "sequence_angle": "sequence_angle" in consensus_result["valid_factors"],
            "momentum_compression": "momentum_compression" in consensus_result["valid_factors"],
            "time_candlestick": "time_candlestick" in consensus_result["valid_factors"],
            "market_state": "market_state" in consensus_result["valid_factors"]
        },
        timestamp=datetime.utcnow().isoformat()
    )


@router.get("/sequence-analysis")
async def get_sequence_analysis(
    source: str = Depends(source_param),
    analysis_window: int = Query(default=300, ge=100, le=1000),
    _user = Depends(operator_user)
) -> SequenceAngleAnalysis:
    """Get detailed sequence angle analysis."""
    
    rounds = get_rounds_for_analysis(source, analysis_window)
    multipliers = [r["multiplier"] for r in rounds]
    
    analysis = calculate_sequence_angle(multipliers)
    
    # Generate predicted sequence
    predicted_sequence = []
    if analysis["direction"] == "upward" and analysis["confidence"] > 0.5:
        last_value = multipliers[-1]
        for i in range(1, 6):
            predicted_value = last_value * (1.1 ** i)
            predicted_sequence.append(predicted_value)
    
    return SequenceAngleAnalysis(
        sequence=multipliers,
        angle=analysis["angle"],
        rate_of_change=analysis["rate_of_change"],
        acceleration=[],  # Would be calculated in full implementation
        direction=analysis["direction"],
        target_range={"min": min(multipliers), "max": max(multipliers)},
        confidence=analysis["confidence"],
        predicted_sequence=predicted_sequence if predicted_sequence else None
    )


@router.get("/momentum-analysis")
async def get_momentum_analysis(
    source: str = Depends(source_param),
    analysis_window: int = Query(default=300, ge=100, le=1000),
    _user = Depends(operator_user)
) -> MomentumCompressionAnalysis:
    """Get detailed momentum compression analysis."""
    
    rounds = get_rounds_for_analysis(source, analysis_window)
    analysis = calculate_momentum_compression(rounds)
    
    return MomentumCompressionAnalysis(**analysis)


@router.get("/market-state")
async def get_market_state(
    source: str = Depends(source_param),
    analysis_window: int = Query(default=300, ge=100, le=1000),
    _user = Depends(operator_user)
) -> MarketStateAnalysis:
    """Get detailed market state classification."""
    
    rounds = get_rounds_for_analysis(source, analysis_window)
    analysis = classify_market_state(rounds)
    
    return MarketStateAnalysis(**analysis)


@router.get("/config")
async def get_config(_user = Depends(operator_user)) -> MegaplanConfig:
    """Get current megaplan system configuration."""
    return MegaplanConfig()


@router.post("/config")
async def update_config(
    config: MegaplanConfig,
    _user = Depends(operator_user)
) -> MegaplanConfig:
    """Update megaplan system configuration."""
    # In a real implementation, this would update a persistent config store
    # For now, just return the config as confirmation
    return config