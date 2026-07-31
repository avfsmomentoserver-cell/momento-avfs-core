"""Pressure metrics and gauge output."""

import logging
from typing import Any, Dict

logger = logging.getLogger("features.pressure.metrics")


class PressureMetrics:
    """Generate pressure metrics and gauge output."""
    
    def format_pressure_gauge(self, pressure_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format pressure data for gauge display.
        
        Args:
            pressure_data: Raw pressure computation results
            
        Returns:
            Formatted gauge output
        """
        return {
            "pressure_percent": pressure_data["pressure_percent"],
            "dominant_ceiling": {
                "level": pressure_data["dominant_ceiling"]["level"],
                "archetype": pressure_data["dominant_ceiling"]["archetype"],
                "pressure": pressure_data["dominant_ceiling"]["pressure"],
                "touches": pressure_data["dominant_ceiling"]["touches"],
                "distance": pressure_data["dominant_ceiling"]["distance"]
            },
            "release_probability": pressure_data["release_probability"],
            "imminent_ranges": pressure_data["imminent_ranges"],
            "all_ceilings": pressure_data["pressure_by_ceiling"]
        }
    
    def get_pressure_status(self, pressure_percent: float) -> str:
        """Get human-readable pressure status.
        
        Args:
            pressure_percent: Pressure percentage (0-100)
            
        Returns:
            Status string
        """
        if pressure_percent >= 90:
            return "critical"
        elif pressure_percent >= 70:
            return "high"
        elif pressure_percent >= 50:
            return "moderate"
        elif pressure_percent >= 30:
            return "low"
        else:
            return "minimal"
