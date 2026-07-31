"""Pressure pattern discovery for vocabulary learning."""

import json
import logging
from typing import Any, Dict, List
from . import db

logger = logging.getLogger("momento.pattern_discovery.pressure")

class PressurePatternDiscovery:
    """Discover patterns from pressure analysis."""
    
    def __init__(self):
        self.min_touches = 3  # Minimum touches for ceiling pattern
    
    def discover_patterns(self, rounds: List[Dict]) -> List[Dict]:
        """Extract patterns from pressure analysis."""
        patterns = []
        
        if not rounds:
            logger.warning("No rounds for pressure discovery")
            return patterns
        
        try:
            from features.pressure.detector import CeilingDetector
            detector = CeilingDetector(min_touches=self.min_touches)
            ceilings = detector.detect_resistance_ceilings(rounds)
            
            patterns.extend(self._extract_ceiling_patterns(ceilings))
            
            logger.info(f"Discovered {len(patterns)} pressure patterns")
        except ImportError:
            logger.warning("Pressure detector not available")
        
        return patterns
    
    def _extract_ceiling_patterns(self, ceilings: List[Dict]) -> List[Dict]:
        """Extract patterns from ceiling data."""
        patterns = []
        
        for ceiling in ceilings:
            # Create pattern for each ceiling
            pattern = {
                "type": "pattern",
                "name": f"ceiling_{ceiling['level']:.2f}_{ceiling['archetype']}",
                "mathematical_definition": {
                    "ceiling_level": ceiling["level"],
                    "min_touches": ceiling["touches"],
                    "archetype": ceiling["archetype"],
                    "touch_range": [min(ceiling["touch_multipliers"]), max(ceiling["touch_multipliers"])]
                },
                "linguistic_mapping": {
                    "description": f"{ceiling['archetype'].capitalize()} resistance ceiling at {ceiling['level']:.2f}x with {ceiling['touches']} touches",
                    "confidence": min(ceiling["touches"] / 10.0, 1.0),
                    "usage_count": ceiling["touches"]
                },
                "source": "pressure",
                "discovered_at": db.utc_now(),
                "status": "candidate"
            }
            patterns.append(pattern)
        
        return patterns

# Global pressure discovery instance
pressure_discovery = PressurePatternDiscovery()
