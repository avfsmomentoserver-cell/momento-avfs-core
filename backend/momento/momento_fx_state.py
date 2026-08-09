"""Momento FX State Engine - Market Physics & State Machine Architecture.

This module implements the FX-style state machine approach where:
- Price is only the visible output
- Points describe the hidden state of the market
- Market movement is the evolution of a state machine

Architecture:
Raw Tick → Point Conversion → Micro Features → Market Physics → State Engine → Prediction Engine

This extends the existing linguistics system with FX-style market physics while maintaining
backward compatibility with existing components.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Sequence, Tuple

from . import linguistics as ling


# ============================================================================
# MARKET STATE ENUMERATIONS
# ============================================================================

class MarketState(Enum):
    """Fundamental market states following FX market physics."""
    CONSOLIDATION = "consolidation"
    COMPRESSION = "compression"
    EXPANSION = "expansion"
    LIQUIDITY_BUILD = "liquidity_build"
    LIQUIDITY_SWEEP = "liquidity_sweep"
    MOMENTUM = "momentum"
    EXHAUSTION = "exhaustion"
    REACCUMULATION = "reaccumulation"
    DISTRIBUTION = "distribution"
    TRANSITION = "transition"
    MEAN_REVERSION = "mean_reversion"
    SHOCK = "shock"
    RECOVERY = "recovery"


class TrendState(Enum):
    """Trend direction states."""
    STRONG_BULL = "strong_bull"
    WEAK_BULL = "weak_bull"
    NEUTRAL = "neutral"
    WEAK_BEAR = "weak_bear"
    STRONG_BEAR = "strong_bear"


class VolatilityState(Enum):
    """Volatility classification states."""
    VERY_LOW = "very_low"
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    EXTREME = "extreme"


# ============================================================================
# POINT CONVERSION WITH MARKET PHYSICS
# ============================================================================

@dataclass
class PointPhysics:
    """Market physics measurements for a single point in time."""
    raw_multiplier: float
    points: float
    band: str
    energy: str
    
    # Micro features
    velocity: float = 0.0
    acceleration: float = 0.0
    displacement: float = 0.0
    impulse: float = 0.0
    
    # Physics measurements
    compression: float = 0.0
    expansion: float = 0.0
    momentum: float = 0.0
    liquidity_potential: float = 0.0
    entropy: float = 0.0
    
    # State indicators
    state: MarketState = MarketState.CONSOLIDATION
    trend: TrendState = TrendState.NEUTRAL
    volatility: VolatilityState = VolatilityState.NORMAL
    
    def as_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "raw_multiplier": self.raw_multiplier,
            "points": self.points,
            "band": self.band,
            "energy": self.energy,
            "velocity": self.velocity,
            "acceleration": self.acceleration,
            "displacement": self.displacement,
            "impulse": self.impulse,
            "compression": self.compression,
            "expansion": self.expansion,
            "momentum": self.momentum,
            "liquidity_potential": self.liquidity_potential,
            "entropy": self.entropy,
            "state": self.state.value,
            "trend": self.trend.value,
            "volatility": self.volatility.value,
        }


@dataclass
class MarketStateSnapshot:
    """Complete market state at a point in time."""
    timestamp: datetime
    physics: PointPhysics
    
    # Composite indices
    compression_score: float = 0.0
    expansion_score: float = 0.0
    liquidity_score: float = 0.0
    momentum_score: float = 0.0
    exhaustion_score: float = 0.0
    entropy_score: float = 0.0
    volatility_score: float = 0.0
    persistence_score: float = 0.0
    efficiency_score: float = 0.0
    fractal_alignment: float = 0.0
    
    # State transitions
    previous_state: Optional[MarketState] = None
    transition_probability: float = 0.0
    expected_next_states: List[Tuple[MarketState, float]] = field(default_factory=list)
    
    # DNA fingerprint
    dna_signature: str = ""
    dna_confidence: float = 0.0
    
    def as_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "physics": self.physics.as_dict(),
            "composite_indices": {
                "compression": self.compression_score,
                "expansion": self.expansion_score,
                "liquidity": self.liquidity_score,
                "momentum": self.momentum_score,
                "exhaustion": self.exhaustion_score,
                "entropy": self.entropy_score,
                "volatility": self.volatility_score,
                "persistence": self.persistence_score,
                "efficiency": self.efficiency_score,
                "fractal_alignment": self.fractal_alignment,
            },
            "state_transitions": {
                "previous_state": self.previous_state.value if self.previous_state else None,
                "transition_probability": self.transition_probability,
                "expected_next_states": [
                    {"state": state.value, "probability": prob}
                    for state, prob in self.expected_next_states
                ],
            },
            "dna": {
                "signature": self.dna_signature,
                "confidence": self.dna_confidence,
            },
        }


# ============================================================================
# POINT CONVERSION ENGINE
# ============================================================================

class PointConversionEngine:
    """Converts raw price/multiplier data into standardized point measurements.
    
    This is the foundation of the FX state machine approach - treating point conversion
    as a universal measurement space rather than a price space.
    """
    
    def __init__(self, window_size: int = 40):
        """Initialize the point conversion engine.
        
        Args:
            window_size: Number of historical points to use for calculations
        """
        self.window_size = window_size
        
    def convert_point(self, multiplier: float, history: Sequence[float]) -> PointPhysics:
        """Convert a single multiplier into a point with physics measurements.
        
        Args:
            multiplier: Current multiplier value
            history: Historical multiplier values for context
            
        Returns:
            PointPhysics with all micro features and physics measurements
        """
        # Basic linguistics conversion
        token = ling.tokenize(multiplier)
        points = token.points
        
        # Calculate micro features
        velocity = self._calculate_velocity(multiplier, history)
        acceleration = self._calculate_acceleration(history)
        displacement = self._calculate_displacement(multiplier, history)
        impulse = self._calculate_impulse(multiplier, history)
        
        # Calculate physics measurements
        compression = self._calculate_compression(history)
        expansion = self._calculate_expansion(history)
        momentum = self._calculate_momentum(history)
        liquidity_potential = self._calculate_liquidity_potential(history)
        entropy = self._calculate_entropy(history)
        
        # Determine states
        state = self._classify_market_state(compression, expansion, momentum, history)
        trend = self._classify_trend(history)
        volatility = self._classify_volatility(history)
        
        return PointPhysics(
            raw_multiplier=multiplier,
            points=points,
            band=token.band,
            energy=token.energy,
            velocity=velocity,
            acceleration=acceleration,
            displacement=displacement,
            impulse=impulse,
            compression=compression,
            expansion=expansion,
            momentum=momentum,
            liquidity_potential=liquidity_potential,
            entropy=entropy,
            state=state,
            trend=trend,
            volatility=volatility,
        )
    
    def _calculate_velocity(self, current: float, history: Sequence[float]) -> float:
        """Calculate rate of change (velocity) in point space."""
        if len(history) < 2:
            return 0.0
        
        current_points = ling.to_points(current)
        previous_points = ling.to_points(history[-1])
        
        return round(current_points - previous_points, 3)
    
    def _calculate_acceleration(self, history: Sequence[float]) -> float:
        """Calculate change in velocity (acceleration)."""
        if len(history) < 3:
            return 0.0
        
        points = [ling.to_points(m) for m in history[-3:]]
        velocities = [points[i] - points[i-1] for i in range(1, len(points))]
        
        return round(velocities[-1] - velocities[-2], 3)
    
    def _calculate_displacement(self, current: float, history: Sequence[float]) -> float:
        """Calculate displacement from mean in point space."""
        if not history:
            return 0.0
        
        points = [ling.to_points(m) for m in history]
        mean_points = statistics.mean(points)
        current_points = ling.to_points(current)
        
        return round(current_points - mean_points, 3)
    
    def _calculate_impulse(self, current: float, history: Sequence[float]) -> float:
        """Calculate impulse strength (sudden movement)."""
        if len(history) < 5:
            return 0.0
        
        recent_points = [ling.to_points(m) for m in history[-5:]]
        current_points = ling.to_points(current)
        
        # Impulse is deviation from recent trend
        trend = (recent_points[-1] - recent_points[0]) / len(recent_points)
        expected = recent_points[-1] + trend
        impulse = current_points - expected
        
        return round(impulse, 3)
    
    def _calculate_compression(self, history: Sequence[float]) -> float:
        """Calculate compression score (0-100) - stored market energy."""
        if len(history) < 10:
            return 0.0
        
        points = [ling.to_points(m) for m in history[-10:]]
        
        # Compression metrics
        variance = statistics.pvariance(points) if len(points) > 1 else 0
        range_points = max(points) - min(points)
        avg_displacement = statistics.mean([abs(p - statistics.mean(points)) for p in points])
        
        # Lower variance + lower range + lower displacement = higher compression
        compression = 100 - min(100, (variance * 10 + range_points * 2 + avg_displacement * 5))
        
        return round(compression, 2)
    
    def _calculate_expansion(self, history: Sequence[float]) -> float:
        """Calculate expansion score (0-100) - energy release."""
        if len(history) < 10:
            return 0.0
        
        points = [ling.to_points(m) for m in history[-10:]]
        
        # Expansion metrics
        recent_velocity = points[-1] - points[-5] if len(points) >= 5 else 0
        variance = statistics.pvariance(points) if len(points) > 1 else 0
        range_points = max(points) - min(points)
        
        # Higher velocity + higher variance + higher range = higher expansion
        expansion = min(100, (abs(recent_velocity) * 5 + variance * 10 + range_points * 3))
        
        return round(expansion, 2)
    
    def _calculate_momentum(self, history: Sequence[float]) -> float:
        """Calculate momentum score (0-100) - directional force."""
        if len(history) < 10:
            return 0.0
        
        points = [ling.to_points(m) for m in history[-10:]]
        
        # Momentum components
        velocity = points[-1] - points[0]
        acceleration = (points[-1] - points[-3]) - (points[-3] - points[-5]) if len(points) >= 5 else 0
        directional_persistence = sum(1 for i in range(1, len(points)) if points[i] > points[i-1]) / len(points)
        
        # Combine into momentum score
        momentum = min(100, (
            abs(velocity) * 3 +
            abs(acceleration) * 2 +
            directional_persistence * 40
        ))
        
        return round(momentum, 2)
    
    def _calculate_liquidity_potential(self, history: Sequence[float]) -> float:
        """Calculate liquidity potential score (0-100)."""
        if len(history) < 20:
            return 50.0
        
        points = [ling.to_points(m) for m in history[-20:]]
        
        # Liquidity builds at consolidation zones
        variance = statistics.pvariance(points) if len(points) > 1 else 0
        range_points = max(points) - min(points)
        
        # Lower volatility = higher liquidity potential
        liquidity = 100 - min(100, variance * 20 + range_points * 5)
        
        return round(liquidity, 2)
    
    def _calculate_entropy(self, history: Sequence[float]) -> float:
        """Calculate entropy score (0-100) - randomness measurement."""
        if len(history) < 10:
            return 50.0
        
        points = [ling.to_points(m) for m in history[-10:]]
        
        # Calculate direction changes
        directions = [1 if points[i] > points[i-1] else -1 if points[i] < points[i-1] else 0 
                     for i in range(1, len(points))]
        direction_changes = sum(1 for i in range(1, len(directions)) if directions[i] != directions[i-1])
        
        # More direction changes = higher entropy
        entropy = min(100, direction_changes * 15)
        
        return round(entropy, 2)
    
    def _classify_market_state(self, compression: float, expansion: float, 
                               momentum: float, history: Sequence[float]) -> MarketState:
        """Classify the current market state based on physics measurements."""
        
        # Shock state - sudden extreme movement
        if expansion > 80 and momentum > 70:
            return MarketState.SHOCK
        
        # Compression state - high stored energy
        if compression > 75:
            return MarketState.COMPRESSION
        
        # Expansion state - energy release
        if expansion > 60:
            return MarketState.EXPANSION
        
        # Consolidation - balanced market
        if compression > 50 and expansion < 40:
            return MarketState.CONSOLIDATION
        
        # Momentum state - strong directional force
        if momentum > 60:
            return MarketState.MOMENTUM
        
        # Exhaustion - momentum declining
        if momentum < 30 and expansion > 40:
            return MarketState.EXHAUSTION
        
        # Default to consolidation
        return MarketState.CONSOLIDATION
    
    def _classify_trend(self, history: Sequence[float]) -> TrendState:
        """Classify the trend state."""
        if len(history) < 20:
            return TrendState.NEUTRAL
        
        points = [ling.to_points(m) for m in history[-20:]]
        
        # Calculate trend strength
        first_half = points[:10]
        second_half = points[10:]
        first_mean = statistics.mean(first_half)
        second_mean = statistics.mean(second_half)
        trend = second_mean - first_mean
        
        # Calculate persistence
        up_moves = sum(1 for i in range(1, len(points)) if points[i] > points[i-1])
        persistence = up_moves / (len(points) - 1)
        
        # Classify trend
        if trend > 5 and persistence > 0.6:
            return TrendState.STRONG_BULL
        elif trend > 2 and persistence > 0.55:
            return TrendState.WEAK_BULL
        elif trend < -5 and persistence < 0.4:
            return TrendState.STRONG_BEAR
        elif trend < -2 and persistence < 0.45:
            return TrendState.WEAK_BEAR
        else:
            return TrendState.NEUTRAL
    
    def _classify_volatility(self, history: Sequence[float]) -> VolatilityState:
        """Classify the volatility state."""
        if len(history) < 20:
            return VolatilityState.NORMAL
        
        points = [ling.to_points(m) for m in history[-20:]]
        variance = statistics.pvariance(points) if len(points) > 1 else 0
        range_points = max(points) - min(points)
        
        # Classify volatility
        if variance < 0.5 and range_points < 10:
            return VolatilityState.VERY_LOW
        elif variance < 1.0 and range_points < 20:
            return VolatilityState.LOW
        elif variance < 3.0 and range_points < 40:
            return VolatilityState.NORMAL
        elif variance < 6.0 and range_points < 70:
            return VolatilityState.HIGH
        else:
            return VolatilityState.EXTREME


# ============================================================================
# MARKET STATE ENGINE
# ============================================================================

class MarketStateEngine:
    """Analyzes market states and transitions using point physics.
    
    This engine processes point physics data to identify market states,
    transition probabilities, and generate state-based forecasts.
    """
    
    def __init__(self, window_size: int = 40):
        """Initialize the market state engine.
        
        Args:
            window_size: Number of historical points to use for state analysis
        """
        self.window_size = window_size
        self.point_engine = PointConversionEngine(window_size)
        
    def analyze_state(self, multipliers: Sequence[float], 
                      timestamp: Optional[datetime] = None) -> MarketStateSnapshot:
        """Analyze the current market state.
        
        Args:
            multipliers: Historical multiplier values
            timestamp: Current timestamp (defaults to now)
            
        Returns:
            MarketStateSnapshot with complete state analysis
        """
        if not multipliers:
            raise ValueError("No multipliers provided for state analysis")
        
        timestamp = timestamp or datetime.utcnow()
        current = multipliers[-1]
        history = multipliers[:-1]
        
        # Convert current point with physics
        physics = self.point_engine.convert_point(current, multipliers)
        
        # Calculate composite indices
        compression_score = self._calculate_compression_index(multipliers)
        expansion_score = self._calculate_expansion_index(multipliers)
        liquidity_score = self._calculate_liquidity_index(multipliers)
        momentum_score = self._calculate_momentum_index(multipliers)
        exhaustion_score = self._calculate_exhaustion_index(multipliers)
        entropy_score = self._calculate_entropy_index(multipliers)
        volatility_score = self._calculate_volatility_index(multipliers)
        persistence_score = self._calculate_persistence_index(multipliers)
        efficiency_score = self._calculate_efficiency_index(multipliers)
        fractal_alignment = self._calculate_fractal_alignment(multipliers)
        
        # Analyze state transitions
        previous_state = self._get_previous_state(multipliers)
        transition_probability = self._calculate_transition_probability(multipliers)
        expected_next_states = self._predict_next_states(multipliers)
        
        # Generate DNA signature
        dna_signature, dna_confidence = self._generate_dna_signature(multipliers)
        
        return MarketStateSnapshot(
            timestamp=timestamp,
            physics=physics,
            compression_score=compression_score,
            expansion_score=expansion_score,
            liquidity_score=liquidity_score,
            momentum_score=momentum_score,
            exhaustion_score=exhaustion_score,
            entropy_score=entropy_score,
            volatility_score=volatility_score,
            persistence_score=persistence_score,
            efficiency_score=efficiency_score,
            fractal_alignment=fractal_alignment,
            previous_state=previous_state,
            transition_probability=transition_probability,
            expected_next_states=expected_next_states,
            dna_signature=dna_signature,
            dna_confidence=dna_confidence,
        )
    
    def _calculate_compression_index(self, multipliers: Sequence[float]) -> float:
        """Calculate composite compression index."""
        if len(multipliers) < 20:
            return 0.0
        
        points = [ling.to_points(m) for m in multipliers[-20:]]
        
        # Multiple compression factors
        variance_factor = max(0, 100 - statistics.pvariance(points) * 20)
        range_factor = max(0, 100 - (max(points) - min(points)) * 3)
        displacement_factor = max(0, 100 - statistics.mean([abs(p - statistics.mean(points)) for p in points]) * 10)
        
        return round((variance_factor + range_factor + displacement_factor) / 3, 2)
    
    def _calculate_expansion_index(self, multipliers: Sequence[float]) -> float:
        """Calculate composite expansion index."""
        if len(multipliers) < 20:
            return 0.0
        
        points = [ling.to_points(m) for m in multipliers[-20:]]
        
        # Multiple expansion factors
        velocity_factor = min(100, abs(points[-1] - points[-10]) * 5)
        variance_factor = min(100, statistics.pvariance(points) * 15)
        range_factor = min(100, (max(points) - min(points)) * 2)
        
        return round((velocity_factor + variance_factor + range_factor) / 3, 2)
    
    def _calculate_liquidity_index(self, multipliers: Sequence[float]) -> float:
        """Calculate composite liquidity index."""
        if len(multipliers) < 30:
            return 50.0
        
        points = [ling.to_points(m) for m in multipliers[-30:]]
        
        # Liquidity builds at consolidation zones
        recent_variance = statistics.pvariance(points[-10:]) if len(points[-10:]) > 1 else 0
        overall_variance = statistics.pvariance(points) if len(points) > 1 else 0
        
        # Lower recent variance relative to overall = liquidity building
        liquidity_ratio = recent_variance / (overall_variance + 0.001)
        liquidity_score = max(0, min(100, 100 - liquidity_ratio * 100))
        
        return round(liquidity_score, 2)
    
    def _calculate_momentum_index(self, multipliers: Sequence[float]) -> float:
        """Calculate composite momentum index."""
        if len(multipliers) < 20:
            return 0.0
        
        points = [ling.to_points(m) for m in multipliers[-20:]]
        
        # Momentum components
        short_term_velocity = points[-1] - points[-5]
        medium_term_velocity = points[-1] - points[-10]
        long_term_velocity = points[-1] - points[-20]
        
        # Weighted momentum
        momentum = (abs(short_term_velocity) * 3 + 
                   abs(medium_term_velocity) * 2 + 
                   abs(long_term_velocity)) / 6
        
        return round(min(100, momentum * 10), 2)
    
    def _calculate_exhaustion_index(self, multipliers: Sequence[float]) -> float:
        """Calculate exhaustion index - remaining trend energy."""
        if len(multipliers) < 20:
            return 0.0
        
        points = [ling.to_points(m) for m in multipliers[-20:]]
        
        # Exhaustion indicators
        recent_velocity = points[-1] - points[-5]
        previous_velocity = points[-5] - points[-10]
        velocity_decline = previous_velocity - recent_velocity if previous_velocity > 0 else 0
        
        # Failed highs
        recent_high = max(points[-10:])
        current = points[-1]
        failed_high = max(0, recent_high - current) if current < recent_high else 0
        
        # Combine into exhaustion score
        exhaustion = min(100, velocity_decline * 20 + failed_high * 5)
        
        return round(exhaustion, 2)
    
    def _calculate_entropy_index(self, multipliers: Sequence[float]) -> float:
        """Calculate entropy index - randomness measurement."""
        if len(multipliers) < 20:
            return 50.0
        
        points = [ling.to_points(m) for m in multipliers[-20:]]
        
        # Calculate direction changes
        directions = [1 if points[i] > points[i-1] else -1 if points[i] < points[i-1] else 0 
                     for i in range(1, len(points))]
        direction_changes = sum(1 for i in range(1, len(directions)) if directions[i] != directions[i-1])
        
        # Calculate entropy based on direction changes
        entropy = min(100, direction_changes * 12)
        
        return round(entropy, 2)
    
    def _calculate_volatility_index(self, multipliers: Sequence[float]) -> float:
        """Calculate composite volatility index."""
        if len(multipliers) < 20:
            return 50.0
        
        points = [ling.to_points(m) for m in multipliers[-20:]]
        variance = statistics.pvariance(points) if len(points) > 1 else 0
        range_points = max(points) - min(points)
        
        # Combine into volatility score
        volatility = min(100, variance * 15 + range_points * 2)
        
        return round(volatility, 2)
    
    def _calculate_persistence_index(self, multipliers: Sequence[float]) -> float:
        """Calculate trend persistence index."""
        if len(multipliers) < 20:
            return 50.0
        
        points = [ling.to_points(m) for m in multipliers[-20:]]
        
        # Calculate directional persistence
        up_moves = sum(1 for i in range(1, len(points)) if points[i] > points[i-1])
        persistence = (up_moves / (len(points) - 1)) * 100
        
        return round(persistence, 2)
    
    def _calculate_efficiency_index(self, multipliers: Sequence[float]) -> float:
        """Calculate efficiency index - progress per unit of movement."""
        if len(multipliers) < 20:
            return 50.0
        
        points = [ling.to_points(m) for m in multipliers[-20:]]
        
        # Calculate total movement vs net progress
        total_movement = sum(abs(points[i] - points[i-1]) for i in range(1, len(points)))
        net_progress = abs(points[-1] - points[0])
        
        if total_movement == 0:
            return 50.0
        
        efficiency = (net_progress / total_movement) * 100
        
        return round(efficiency, 2)
    
    def _calculate_fractal_alignment(self, multipliers: Sequence[float]) -> float:
        """Calculate multi-timeframe fractal alignment."""
        # This is a placeholder - would analyze multiple timeframes in production
        # For now, return a neutral value
        return 50.0
    
    def _get_previous_state(self, multipliers: Sequence[float]) -> Optional[MarketState]:
        """Get the previous market state."""
        if len(multipliers) < 2:
            return None
        
        previous_physics = self.point_engine.convert_point(multipliers[-2], multipliers[:-1])
        return previous_physics.state
    
    def _calculate_transition_probability(self, multipliers: Sequence[float]) -> float:
        """Calculate probability of state transition."""
        if len(multipliers) < 10:
            return 0.0
        
        # Analyze recent state changes
        states = []
        for i in range(5, len(multipliers)):
            physics = self.point_engine.convert_point(multipliers[i], multipliers[:i])
            states.append(physics.state)
        
        # Count transitions
        transitions = sum(1 for i in range(1, len(states)) if states[i] != states[i-1])
        transition_rate = transitions / len(states) if states else 0
        
        return round(transition_rate, 2)
    
    def _predict_next_states(self, multipliers: Sequence[float]) -> List[Tuple[MarketState, float]]:
        """Predict next likely states with probabilities."""
        # This is a simplified version - would use Markov chains in production
        current_physics = self.point_engine.convert_point(multipliers[-1], multipliers)
        
        # State transition logic based on current state
        transitions = []
        
        if current_physics.state == MarketState.COMPRESSION:
            transitions = [
                (MarketState.EXPANSION, 0.4),
                (MarketState.LIQUIDITY_BUILD, 0.3),
                (MarketState.CONSOLIDATION, 0.2),
                (MarketState.SHOCK, 0.1),
            ]
        elif current_physics.state == MarketState.EXPANSION:
            transitions = [
                (MarketState.MOMENTUM, 0.5),
                (MarketState.EXHAUSTION, 0.3),
                (MarketState.REACCUMULATION, 0.2),
            ]
        elif current_physics.state == MarketState.MOMENTUM:
            transitions = [
                (MarketState.EXHAUSTION, 0.4),
                (MarketState.REACCUMULATION, 0.3),
                (MarketState.DISTRIBUTION, 0.2),
                (MarketState.EXPANSION, 0.1),
            ]
        else:
            # Default transitions
            transitions = [
                (MarketState.CONSOLIDATION, 0.4),
                (MarketState.COMPRESSION, 0.3),
                (MarketState.TRANSITION, 0.3),
            ]
        
        return transitions
    
    def _generate_dna_signature(self, multipliers: Sequence[float]) -> Tuple[str, float]:
        """Generate DNA signature for current state pattern."""
        if len(multipliers) < 10:
            return "", 0.0
        
        # Generate simplified DNA signature based on state sequence
        states = []
        for i in range(5, len(multipliers)):
            physics = self.point_engine.convert_point(multipliers[i], multipliers[:i])
            states.append(physics.state.value[0].upper())  # First letter of state
        
        signature = "".join(states[-8:])  # Last 8 states
        confidence = min(100, len(multipliers) * 2)  # More data = higher confidence
        
        return signature, round(confidence, 2)


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def convert_multiplier_sequence(multipliers: Sequence[float]) -> List[PointPhysics]:
    """Convert a sequence of multipliers to point physics.
    
    Args:
        multipliers: Sequence of multiplier values
        
    Returns:
        List of PointPhysics for each multiplier
    """
    engine = PointConversionEngine()
    physics_list = []
    
    for i, multiplier in enumerate(multipliers):
        history = multipliers[:i]
        physics = engine.convert_point(multiplier, history)
        physics_list.append(physics)
    
    return physics_list


def analyze_market_state_sequence(multipliers: Sequence[float]) -> List[MarketStateSnapshot]:
    """Analyze market states for a sequence of multipliers.
    
    Args:
        multipliers: Sequence of multiplier values
        
    Returns:
        List of MarketStateSnapshot for each point in time
    """
    engine = MarketStateEngine()
    snapshots = []
    
    for i in range(10, len(multipliers)):  # Need minimum history
        window = multipliers[:i+1]
        snapshot = engine.analyze_state(window)
        snapshots.append(snapshot)
    
    return snapshots