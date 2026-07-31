"""Pressure calculation for resistance ceiling analysis."""

import logging
from typing import Any, Dict, List

logger = logging.getLogger("features.pressure.calculator")


class PressureCalculator:
    """Calculate pressure stored under resistance ceilings."""
    
    def __init__(self) -> None:
        self.history_window = 20  # Number of rounds to consider for history
    
    def compute_gap_energy(
        self,
        current_multiplier: float,
        ceiling: float,
        history: List[float]
    ) -> float:
        """Compute energy stored when approaching a ceiling.
        
        Energy based on:
        - Distance to ceiling
        - Frequency of recent approaches
        - Velocity of approach
        
        Args:
            current_multiplier: Current multiplier value
            ceiling: Ceiling level
            history: Recent multiplier history
            
        Returns:
            Energy value (0-100, capped)
        """
        if current_multiplier >= ceiling:
            return 0.0  # Already at or above ceiling
        
        distance_to_ceiling = ceiling - current_multiplier
        
        if distance_to_ceiling <= 0:
            return 0.0
        
        # Calculate approach velocity
        approach_velocity = self._calculate_approach_velocity(history)
        
        # Count recent touches near this ceiling
        touch_frequency = self._count_recent_touches(ceiling, history)
        
        # Energy increases with proximity and frequency
        # Closer to ceiling = higher energy
        # More frequent touches = higher energy
        # Higher velocity = higher energy
        
        proximity_factor = 1.0 / (distance_to_ceiling + 0.1)
        frequency_factor = min(touch_frequency / 5.0, 2.0)
        velocity_factor = min(approach_velocity * 10.0, 2.0)
        
        energy = proximity_factor * frequency_factor * velocity_factor * 10.0
        
        return min(energy, 100.0)
    
    def _calculate_approach_velocity(self, history: List[float]) -> float:
        """Calculate velocity of approach to ceilings.
        
        Args:
            history: Recent multiplier history
            
        Returns:
            Velocity value
        """
        if len(history) < 2:
            return 0.0
        
        # Calculate average rate of change
        changes = []
        for i in range(1, len(history)):
            change = history[i] - history[i-1]
            if change > 0:  # Only consider upward movement
                changes.append(change)
        
        if not changes:
            return 0.0
        
        return sum(changes) / len(changes)
    
    def _count_recent_touches(self, ceiling: float, history: List[float]) -> int:
        """Count recent touches near a ceiling level.
        
        Args:
            ceiling: Ceiling level
            history: Recent multiplier history
            
        Returns:
            Number of recent touches
        """
        tolerance = 0.05 * ceiling
        touches = 0
        
        for value in history:
            if abs(value - ceiling) <= tolerance:
                touches += 1
        
        return touches
    
    def compute_pressure(
        self,
        rounds: List[Dict[str, Any]],
        ceilings: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Compute total pressure across all active ceilings.
        
        Args:
            rounds: Recent rounds
            ceilings: Detected resistance ceilings
            
        Returns:
            Dictionary with pressure metrics
        """
        if not rounds or not ceilings:
            return {
                "total_pressure": 0.0,
                "pressure_by_ceiling": [],
                "dominant_ceiling": None,
                "release_probability": 0.0,
                "imminent_ranges": []
            }
        
        current_multiplier = float(rounds[-1]["multiplier"])
        recent_multipliers = [float(r["multiplier"]) for r in rounds[-self.history_window:]]
        
        # Compute pressure for each ceiling
        pressure_by_ceiling = []
        for ceiling in ceilings:
            level = ceiling["level"]
            if level <= current_multiplier:
                continue  # Already above this ceiling
            
            energy = self.compute_gap_energy(current_multiplier, level, recent_multipliers)
            
            pressure_by_ceiling.append({
                "level": level,
                "archetype": ceiling["archetype"],
                "pressure": round(energy, 2),
                "touches": ceiling["touches"],
                "distance": round(level - current_multiplier, 2)
            })
        
        if not pressure_by_ceiling:
            return {
                "total_pressure": 0.0,
                "pressure_by_ceiling": [],
                "dominant_ceiling": None,
                "release_probability": 0.0,
                "imminent_ranges": []
            }
        
        # Sort by pressure (descending)
        pressure_by_ceiling.sort(key=lambda x: x["pressure"], reverse=True)
        
        # Calculate total pressure
        total_pressure = sum(c["pressure"] for c in pressure_by_ceiling)
        total_pressure = min(total_pressure, 100.0)
        
        # Find dominant ceiling
        dominant_ceiling = pressure_by_ceiling[0]
        
        # Calculate release probability based on total pressure
        release_probability = min(total_pressure / 100.0, 1.0)
        
        # Suggest imminent ranges (ceilings with high pressure)
        imminent_ranges = []
        for ceiling in pressure_by_ceiling:
            if ceiling["pressure"] > 70.0:
                imminent_ranges.append([
                    round(ceiling["level"] - 0.1, 2),
                    round(ceiling["level"] + 0.1, 2)
                ])
        
        return {
            "pressure_percent": round(total_pressure, 1),
            "pressure_by_ceiling": pressure_by_ceiling,
            "dominant_ceiling": dominant_ceiling,
            "release_probability": round(release_probability, 2),
            "imminent_ranges": imminent_ranges
        }
