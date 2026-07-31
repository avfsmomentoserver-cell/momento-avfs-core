"""Exhaustion calculations for moonshot prediction.

Calculates various exhaustion metrics to predict release conditions:
- Pressure buildup duration
- Compression saturation
- Ceiling proximity decay
- Combined release imminence
"""

import statistics
from typing import Any, Dict, List


class ExhaustionCalculator:
    """Calculate exhaustion metrics for moonshot prediction."""
    
    def __init__(self) -> None:
        self.pressure_threshold = 50.0  # Pressure percent threshold
        self.compression_window = 20
        self.ceiling_proximity_window = 10
    
    def compute_pressure_exhaustion(
        self,
        rounds: List[Dict[str, Any]],
        pressure_history: List[float]
    ) -> Dict[str, Any]:
        """Calculate how long pressure has been building without release.
        
        Args:
            rounds: Historical rounds
            pressure_history: Historical pressure values
            
        Returns:
            Dictionary with pressure exhaustion metrics
        """
        if not pressure_history or len(pressure_history) < 5:
            return {
                "pressure_buildup_duration": 0,
                "pressure_peak": 0.0,
                "pressure_trend": "unknown",
                "exhaustion_score": 0.0
            }
        
        # Find how long pressure has been above threshold
        buildup_rounds = 0
        for i in range(len(pressure_history) - 1, -1, -1):
            if pressure_history[i] >= self.pressure_threshold:
                buildup_rounds += 1
            else:
                break
        
        # Calculate pressure trend
        recent_pressure = pressure_history[-10:]
        if len(recent_pressure) >= 3:
            if recent_pressure[-1] > recent_pressure[0]:
                trend = "increasing"
            elif recent_pressure[-1] < recent_pressure[0]:
                trend = "decreasing"
            else:
                trend = "stable"
        else:
            trend = "unknown"
        
        # Peak pressure in recent history
        pressure_peak = max(pressure_history[-20:]) if len(pressure_history) >= 20 else max(pressure_history)
        
        # Exhaustion score: longer buildup + higher peak = higher exhaustion
        exhaustion_score = min(1.0, (buildup_rounds / 30.0) * 0.6 + (pressure_peak / 100.0) * 0.4)
        
        return {
            "pressure_buildup_duration": buildup_rounds,
            "pressure_peak": round(pressure_peak, 2),
            "pressure_trend": trend,
            "exhaustion_score": round(exhaustion_score, 3)
        }
    
    def compute_compression_exhaustion(
        self,
        rounds: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate compression saturation vs historical patterns.
        
        Args:
            rounds: Historical rounds
            
        Returns:
            Dictionary with compression exhaustion metrics
        """
        if len(rounds) < self.compression_window:
            return {
                "current_compression": 0.0,
                "historical_max_compression": 0.0,
                "compression_saturation": 0.0,
                "exhaustion_score": 0.0
            }
        
        # Calculate current compression
        recent_multipliers = [r["multiplier"] for r in rounds[-self.compression_window:]]
        if len(recent_multipliers) < 2:
            current_compression = 0.0
        else:
            stdev = statistics.pstdev(recent_multipliers)
            mean = statistics.mean(recent_multipliers)
            cv = stdev / mean if mean > 0 else 0
            current_compression = 1.0 / (cv + 1.0)
        
        # Calculate historical max compression (rolling windows)
        historical_compressions = []
        window_size = self.compression_window
        
        for i in range(window_size, len(rounds)):
            window_multipliers = [r["multiplier"] for r in rounds[i-window_size:i]]
            if len(window_multipliers) >= 2:
                stdev = statistics.pstdev(window_multipliers)
                mean = statistics.mean(window_multipliers)
                cv = stdev / mean if mean > 0 else 0
                comp = 1.0 / (cv + 1.0)
                historical_compressions.append(comp)
        
        historical_max = max(historical_compressions) if historical_compressions else current_compression
        
        # Saturation: how close to historical maximum
        saturation = current_compression / historical_max if historical_max > 0 else 0.0
        
        # Exhaustion score: high saturation + high current compression
        exhaustion_score = min(1.0, saturation * 0.5 + current_compression * 0.5)
        
        return {
            "current_compression": round(current_compression, 3),
            "historical_max_compression": round(historical_max, 3),
            "compression_saturation": round(saturation, 3),
            "exhaustion_score": round(exhaustion_score, 3)
        }
    
    def compute_ceiling_exhaustion(
        self,
        rounds: List[Dict[str, Any]],
        ceilings: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate time spent near ceiling without breakthrough.
        
        Args:
            rounds: Historical rounds
            ceilings: Resistance ceilings
            
        Returns:
            Dictionary with ceiling exhaustion metrics
        """
        if not ceilings or len(rounds) < self.ceiling_proximity_window:
            return {
                "ceiling_proximity_duration": 0,
                "nearest_ceiling": None,
                "proximity_decay": 0.0,
                "exhaustion_score": 0.0
            }
        
        current_multiplier = rounds[-1]["multiplier"]
        
        # Find nearest ceiling above current
        nearest_ceiling = None
        min_distance = float('inf')
        
        for ceiling in ceilings:
            level = ceiling["level"]
            if level > current_multiplier:
                distance = level - current_multiplier
                if distance < min_distance:
                    min_distance = distance
                    nearest_ceiling = ceiling
        
        if not nearest_ceiling:
            return {
                "ceiling_proximity_duration": 0,
                "nearest_ceiling": None,
                "proximity_decay": 0.0,
                "exhaustion_score": 0.0
            }
        
        # Calculate how long we've been near this ceiling
        proximity_threshold = min_distance * 1.5  # Within 50% of distance
        proximity_rounds = 0
        
        for i in range(len(rounds) - 1, -1, -1):
            if rounds[i]["multiplier"] >= nearest_ceiling["level"] - proximity_threshold:
                proximity_rounds += 1
            else:
                break
        
        # Calculate proximity decay (how proximity has changed over time)
        recent_proximities = []
        for r in rounds[-self.ceiling_proximity_window:]:
            prox = nearest_ceiling["level"] - r["multiplier"]
            if prox > 0:
                recent_proximities.append(prox)
        
        if len(recent_proximities) >= 2:
            # If distance is decreasing, decay is positive (getting closer)
            decay = (recent_proximities[0] - recent_proximities[-1]) / recent_proximities[0]
            proximity_decay = max(0.0, min(1.0, decay))
        else:
            proximity_decay = 0.0
        
        # Exhaustion score: long proximity + getting closer = high exhaustion
        exhaustion_score = min(1.0, (proximity_rounds / 20.0) * 0.6 + proximity_decay * 0.4)
        
        return {
            "ceiling_proximity_duration": proximity_rounds,
            "nearest_ceiling": nearest_ceiling,
            "proximity_decay": round(proximity_decay, 3),
            "exhaustion_score": round(exhaustion_score, 3)
        }
    
    def compute_combined_exhaustion(
        self,
        rounds: List[Dict[str, Any]],
        pressure_history: List[float],
        ceilings: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate combined exhaustion score from all factors.
        
        Args:
            rounds: Historical rounds
            pressure_history: Historical pressure values
            ceilings: Resistance ceilings
            
        Returns:
            Dictionary with combined exhaustion metrics
        """
        # Calculate individual exhaustions
        pressure_exhaustion = self.compute_pressure_exhaustion(rounds, pressure_history)
        compression_exhaustion = self.compute_compression_exhaustion(rounds)
        ceiling_exhaustion = self.compute_ceiling_exhaustion(rounds, ceilings)
        
        # Weighted combination (pressure most important, then compression, then ceiling)
        weights = {
            "pressure": 0.4,
            "compression": 0.35,
            "ceiling": 0.25
        }
        
        combined_score = (
            pressure_exhaustion["exhaustion_score"] * weights["pressure"] +
            compression_exhaustion["exhaustion_score"] * weights["compression"] +
            ceiling_exhaustion["exhaustion_score"] * weights["ceiling"]
        )
        
        # Determine release imminence
        if combined_score >= 0.75:
            imminence = "critical"
        elif combined_score >= 0.55:
            imminence = "high"
        elif combined_score >= 0.35:
            imminence = "moderate"
        else:
            imminence = "low"
        
        return {
            "combined_exhaustion_score": round(combined_score, 3),
            "release_imminence": imminence,
            "pressure_exhaustion": pressure_exhaustion,
            "compression_exhaustion": compression_exhaustion,
            "ceiling_exhaustion": ceiling_exhaustion,
            "weights": weights
        }
