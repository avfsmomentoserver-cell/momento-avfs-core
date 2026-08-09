"""FX State API Routes - Market Physics and State Machine endpoints.

This module provides API endpoints for the FX-style state machine approach,
exposing market physics measurements, state transitions, and DNA analysis.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query

from ..deps import source_param
from ... import db, store
from ... import linguistics as ling
from ...momento_fx_state import (
    MarketStateEngine,
    MarketState,
    TrendState,
    VolatilityState,
    convert_multiplier_sequence,
    analyze_market_state_sequence,
)


router = APIRouter(tags=["fx-state"])


# ============================================================================
# MARKET PHYSICS ENDPOINTS
# ============================================================================

@router.get("/fx-state/physics")
async def get_market_physics(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=10, le=1000),
) -> Dict[str, Any]:
    """Get market physics measurements for a source.
    
    Returns point physics data including velocity, acceleration, compression,
    expansion, momentum, and other market physics measurements.
    """
    source_normalized = source
    limit = max(10, min(int(limit), 1000))
    
    # Get historical rounds
    rounds_data = store.get_rounds(source_normalized, limit, 0, "desc")
    if not rounds_data or "rounds" not in rounds_data or not rounds_data["rounds"]:
        return {
            "source": source_normalized,
            "count": 0,
            "physics": [],
        }
    multipliers = [float(r["multiplier"]) for r in rounds_data["rounds"]]
    multipliers.reverse()  # Oldest first for analysis
    
    # Convert to point physics
    physics_list = convert_multiplier_sequence(multipliers)
    
    return {
        "source": source_normalized,
        "count": len(physics_list),
        "physics": [p.as_dict() for p in physics_list],
    }


@router.get("/fx-state/state")
async def get_market_state(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=10, le=1000),
) -> Dict[str, Any]:
    """Get current market state analysis.
    
    Returns comprehensive market state snapshot including composite indices,
    state transitions, and DNA signature.
    """
    source_normalized = source
    limit = max(10, min(int(limit), 1000))
    
    # Get historical rounds
    rounds_data = store.get_rounds(source_normalized, limit, 0, "desc")
    if not rounds_data or "rounds" not in rounds_data or not rounds_data["rounds"]:
        return {
            "source": source_normalized,
            "error": "No rounds data available",
            "state": None,
        }
    multipliers = [float(r["multiplier"]) for r in rounds_data["rounds"]]
    multipliers.reverse()  # Oldest first for analysis
    
    if len(multipliers) < 10:
        return {
            "source": source_normalized,
            "error": "Insufficient data for state analysis (need at least 10 rounds)",
            "state": None,
        }
    
    # Analyze market state
    engine = MarketStateEngine()
    snapshot = engine.analyze_state(multipliers)
    
    return {
        "source": source_normalized,
        "state": snapshot.as_dict(),
    }


@router.get("/fx-state/states/sequence")
async def get_state_sequence(
    source: str = Depends(source_param),
    limit: int = Query(default=200, ge=20, le=2000),
) -> Dict[str, Any]:
    """Get market state sequence over time.
    
    Returns historical state transitions and evolution for analysis.
    """
    source_normalized = source
    limit = max(20, min(int(limit), 2000))
    
    # Get historical rounds
    rounds_data = store.get_rounds(source_normalized, limit, 0, "desc")
    if not rounds_data or "rounds" not in rounds_data or not rounds_data["rounds"]:
        return {
            "source": source_normalized,
            "count": 0,
            "physics": [],
        }
    multipliers = [float(r["multiplier"]) for r in rounds_data["rounds"]]
    multipliers.reverse()  # Oldest first for analysis
    
    if len(multipliers) < 20:
        return {
            "source": source_normalized,
            "error": "Insufficient data for sequence analysis (need at least 20 rounds)",
            "sequence": [],
        }
    
    # Analyze state sequence
    snapshots = analyze_market_state_sequence(multipliers)
    
    return {
        "source": source_normalized,
        "count": len(snapshots),
        "sequence": [s.as_dict() for s in snapshots],
    }


# ============================================================================
# COMPOSITE INDICES ENDPOINTS
# ============================================================================

@router.get("/fx-state/indices")
async def get_composite_indices(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=10, le=1000),
) -> Dict[str, Any]:
    """Get composite market physics indices.
    
    Returns the 12 composite indices that define market state:
    - Compression, Expansion, Liquidity, Momentum, Exhaustion
    - Entropy, Volatility, Persistence, Efficiency, Fractal Alignment
    """
    source_normalized = source
    limit = max(10, min(int(limit), 1000))
    
    # Get historical rounds
    rounds_data = store.get_rounds(source_normalized, limit, 0, "desc")
    multipliers = [float(r["multiplier"]) for r in rounds_data["rounds"]]
    multipliers.reverse()
    
    if len(multipliers) < 10:
        return {
            "source": source_normalized,
            "error": "Insufficient data for indices calculation",
            "indices": {},
        }
    
    # Get current state
    engine = MarketStateEngine()
    snapshot = engine.analyze_state(multipliers)
    
    return {
        "source": source_normalized,
        "indices": {
            "compression": snapshot.compression_score,
            "expansion": snapshot.expansion_score,
            "liquidity": snapshot.liquidity_score,
            "momentum": snapshot.momentum_score,
            "exhaustion": snapshot.exhaustion_score,
            "entropy": snapshot.entropy_score,
            "volatility": snapshot.volatility_score,
            "persistence": snapshot.persistence_score,
            "efficiency": snapshot.efficiency_score,
            "fractal_alignment": snapshot.fractal_alignment,
        },
        "physics": snapshot.physics.as_dict(),
    }


# ============================================================================
# STATE TRANSITIONS ENDPOINTS
# ============================================================================

@router.get("/fx-state/transitions")
async def get_state_transitions(
    source: str = Depends(source_param),
    limit: int = Query(default=200, ge=20, le=2000),
) -> Dict[str, Any]:
    """Get state transition analysis.
    
    Returns transition probabilities, expected next states, and
    transition history for pattern analysis.
    """
    source_normalized = source
    limit = max(20, min(int(limit), 2000))
    
    # Get historical rounds
    rounds_data = store.get_rounds(source_normalized, limit, 0, "desc")
    multipliers = [float(r["multiplier"]) for r in rounds_data["rounds"]]
    multipliers.reverse()
    
    if len(multipliers) < 20:
        return {
            "source": source_normalized,
            "error": "Insufficient data for transition analysis",
            "transitions": {},
        }
    
    # Analyze state sequence
    snapshots = analyze_market_state_sequence(multipliers)
    
    # Calculate transition matrix
    transition_counts: Dict[str, Dict[str, int]] = {}
    for snapshot in snapshots:
        current = snapshot.physics.state.value
        previous = snapshot.previous_state.value if snapshot.previous_state else None
        
        if previous:
            if previous not in transition_counts:
                transition_counts[previous] = {}
            if current not in transition_counts[previous]:
                transition_counts[previous][current] = 0
            transition_counts[previous][current] += 1
    
    # Convert to probabilities
    transition_matrix: Dict[str, Dict[str, float]] = {}
    for from_state, to_states in transition_counts.items():
        total = sum(to_states.values())
        transition_matrix[from_state] = {
            to_state: count / total 
            for to_state, count in to_states.items()
        }
    
    # Get current expected transitions
    current_snapshot = snapshots[-1] if snapshots else None
    expected_transitions = (
        current_snapshot.expected_next_states if current_snapshot else []
    )
    
    return {
        "source": source_normalized,
        "transition_matrix": transition_matrix,
        "current_expected_transitions": [
            {"state": state.value, "probability": prob}
            for state, prob in expected_transitions
        ],
        "transition_probability": (
            current_snapshot.transition_probability if current_snapshot else 0.0
        ),
    }


# ============================================================================
# DNA ANALYSIS ENDPOINTS
# ============================================================================

@router.get("/fx-state/dna")
async def get_dna_analysis(
    source: str = Depends(source_param),
    limit: int = Query(default=200, ge=20, le=2000),
) -> Dict[str, Any]:
    """Get DNA signature analysis.
    
    Returns DNA signatures, confidence scores, and pattern matching
    for historical state sequences.
    """
    source_normalized = source
    limit = max(20, min(int(limit), 2000))
    
    # Get historical rounds
    rounds_data = store.get_rounds(source_normalized, limit, 0, "desc")
    multipliers = [float(r["multiplier"]) for r in rounds_data["rounds"]]
    multipliers.reverse()
    
    if len(multipliers) < 20:
        return {
            "source": source_normalized,
            "error": "Insufficient data for DNA analysis",
            "dna": {},
        }
    
    # Analyze state sequence
    snapshots = analyze_market_state_sequence(multipliers)
    
    # Extract DNA signatures
    dna_signatures = []
    for snapshot in snapshots:
        if snapshot.dna_signature:
            dna_signatures.append({
                "timestamp": snapshot.timestamp.isoformat(),
                "signature": snapshot.dna_signature,
                "confidence": snapshot.dna_confidence,
                "state": snapshot.physics.state.value,
            })
    
    # Get current DNA
    current_dna = (
        {
            "signature": snapshots[-1].dna_signature,
            "confidence": snapshots[-1].dna_confidence,
        }
        if snapshots
        else {}
    )
    
    return {
        "source": source_normalized,
        "current_dna": current_dna,
        "dna_history": dna_signatures,
        "signature_count": len(dna_signatures),
    }


# ============================================================================
# TIMEFRAME CANDLESTICK GROUPING
# ============================================================================

@router.get("/fx-state/candles")
async def get_candlestick_groups(
    source: str = Depends(source_param),
    rounds_per_candle: int = Query(default=5, ge=1, le=100),
    limit: int = Query(default=200, ge=10, le=2000),
) -> Dict[str, Any]:
    """Get candlestick-grouped data by timeframe.
    
    Groups rounds into candlesticks based on rounds_per_candle parameter,
    simulating different timeframes (1m, 5m, 15m, 1h, etc.)
    """
    source_normalized = source
    rounds_per_candle = max(1, min(int(rounds_per_candle), 100))
    limit = max(10, min(int(limit), 2000))
    
    # Get historical rounds
    rounds_data = store.get_rounds(source_normalized, limit, 0, "desc")
    rounds = rounds_data["data"]
    
    if len(rounds) < rounds_per_candle:
        return {
            "source": source_normalized,
            "error": f"Insufficient data for candle grouping (need at least {rounds_per_candle} rounds)",
            "candles": [],
        }
    
    # Group into candlesticks
    candles = []
    for i in range(0, len(rounds), rounds_per_candle):
        group = rounds[i:i + rounds_per_candle]
        if not group:
            continue
        
        multipliers = [float(r["multiplier"]) for r in group]
        points = [ling.to_points(m) for m in multipliers]
        
        candle = {
            "time": group[-1]["timestamp"],
            "rounds_count": len(group),
            "multiplier": {
                "open": multipliers[0],
                "high": max(multipliers),
                "low": min(multipliers),
                "close": multipliers[-1],
            },
            "points": {
                "open": points[0],
                "high": max(points),
                "low": min(points),
                "close": points[-1],
            },
            "band": ling.band_for(multipliers[-1])["key"],
            "energy": ling.energy_of(multipliers[-1]),
        }
        candles.append(candle)
    
    # Reverse to have oldest first
    candles.reverse()
    
    return {
        "source": source_normalized,
        "rounds_per_candle": rounds_per_candle,
        "candle_count": len(candles),
        "candles": candles,
    }


# ============================================================================
# MARKET STATE DEFINITIONS
# ============================================================================

@router.get("/fx-state/definitions/states")
async def get_state_definitions() -> Dict[str, Any]:
    """Get definitions of all market states."""
    return {
        "states": [
            {
                "value": state.value,
                "description": _get_state_description(state),
            }
            for state in MarketState
        ],
        "trends": [
            {
                "value": trend.value,
                "description": _get_trend_description(trend),
            }
            for trend in TrendState
        ],
        "volatility_states": [
            {
                "value": vol.value,
                "description": _get_volatility_description(vol),
            }
            for vol in VolatilityState
        ],
    }


def _get_state_description(state: MarketState) -> str:
    """Get description for a market state."""
    descriptions = {
        MarketState.CONSOLIDATION: "Market stores energy with small point movement, declining volatility, overlapping candles",
        MarketState.COMPRESSION: "Even stronger than consolidation - market compressing like a spring with very low variance",
        MarketState.EXPANSION: "Stored energy releases with high velocity, acceleration, and directional confidence",
        MarketState.LIQUIDITY_BUILD: "Liquidity accumulating at key levels with repeated rejection and slow movement",
        MarketState.LIQUIDITY_SWEEP: "Market grabs liquidity with fast impulse, instant reversal, and large wicks",
        MarketState.MOMENTUM: "Strong directional force measured in point energy with high persistence",
        MarketState.EXHAUSTION: "Momentum decreases with failed highs, lower impulse efficiency, and increasing reversals",
        MarketState.REACCUMULATION: "Trend pauses before continuing with small retracement and preserved momentum",
        MarketState.DISTRIBUTION: "Large participants reducing positions with high volatility and failed breakouts",
        MarketState.TRANSITION: "Market changing personality with compression breaking and momentum shifting",
        MarketState.MEAN_REVERSION: "Market deviating from equilibrium with momentum loss and opposing liquidity",
        MarketState.SHOCK: "Unexpected movement with acceleration spike, range explosion, and liquidity disappearance",
        MarketState.RECOVERY: "Market stabilizes after shock with normalizing volatility and rebuilding liquidity",
    }
    return descriptions.get(state, "Unknown state")


def _get_trend_description(trend: TrendState) -> str:
    """Get description for a trend state."""
    descriptions = {
        TrendState.STRONG_BULL: "Strong upward trend with high persistence and directional confidence",
        TrendState.WEAK_BULL: "Moderate upward trend with some volatility and lower persistence",
        TrendState.NEUTRAL: "No clear directional bias with balanced buying and selling",
        TrendState.WEAK_BEAR: "Moderate downward trend with some volatility and lower persistence",
        TrendState.STRONG_BEAR: "Strong downward trend with high persistence and directional confidence",
    }
    return descriptions.get(trend, "Unknown trend")


def _get_volatility_description(vol: VolatilityState) -> str:
    """Get description for a volatility state."""
    descriptions = {
        VolatilityState.VERY_LOW: "Extremely low volatility with very narrow price ranges",
        VolatilityState.LOW: "Low volatility with narrow price ranges and predictable movement",
        VolatilityState.NORMAL: "Normal market volatility with healthy price movement",
        VolatilityState.HIGH: "High volatility with wide price ranges and increased risk",
        VolatilityState.EXTREME: "Extreme volatility with very wide ranges and unpredictable movement",
    }
    return descriptions.get(vol, "Unknown volatility")