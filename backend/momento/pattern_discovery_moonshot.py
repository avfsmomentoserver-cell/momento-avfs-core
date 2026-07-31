"""Moonshot pattern discovery for vocabulary learning."""

import json
import logging
from typing import Any, Dict, List
from . import db

logger = logging.getLogger("momento.pattern_discovery.moonshot")

class MoonshotPatternDiscovery:
    """Discover patterns from moonshot analysis."""
    
    def __init__(self):
        self.moonshot_threshold = 10.0  # Minimum multiplier for moonshot
        self.pre_window = 20  # Window before moonshot to analyze
    
    def discover_patterns(self, rounds: List[Dict]) -> List[Dict]:
        """Extract patterns from moonshot analysis."""
        patterns = []
        
        if not rounds:
            logger.warning("No rounds for moonshot discovery")
            return patterns
        
        try:
            from features.moonshot_scanner.linguistics import MoonshotLinguistics
            ml = MoonshotLinguistics()
            
            # Find moonshot events
            moonshot_indices = [i for i, r in enumerate(rounds) if r["multiplier"] >= self.moonshot_threshold]
            
            patterns.extend(self._extract_moonshot_patterns(rounds, moonshot_indices, ml))
            
            logger.info(f"Discovered {len(patterns)} moonshot patterns")
        except ImportError:
            logger.warning("Moonshot scanner not available")
        
        return patterns
    
    def _extract_moonshot_patterns(self, rounds: List[Dict], moonshot_indices: List[int], ml) -> List[Dict]:
        """Extract patterns from moonshot events."""
        patterns = []
        
        # Analyze last 5 moonshots
        for idx in moonshot_indices[-5:]:
            pre_rounds = rounds[max(0, idx - self.pre_window):idx]
            
            if len(pre_rounds) < 5:
                continue
            
            current_multiplier = rounds[idx]["multiplier"]
            
            # Compute linguistic factors
            linguistics = ml.compute_all_linguistics(
                pre_rounds,
                {"pressure_percent": 50},
                []
            )
            
            # Extract key factors
            pressure = linguistics.get("pressure", 0.5)
            compression = linguistics.get("compression", 0.5)
            band_transition = linguistics.get("band_transition", {})
            
            pattern = {
                "type": "pattern",
                "name": f"moonshot_precursor_{current_multiplier:.1f}x",
                "mathematical_definition": {
                    "pre_moonshot_window": self.pre_window,
                    "target_multiplier": current_multiplier,
                    "linguistic_factors": {
                        "pressure": pressure,
                        "compression": compression,
                        "band_trend": band_transition.get("trend", "unknown")
                    }
                },
                "linguistic_mapping": {
                    "description": f"Pre-moonshot pattern leading to {current_multiplier:.1f}x with pressure {pressure:.1%} and compression {compression:.1%}",
                    "confidence": (pressure + compression) / 2,
                    "usage_count": 1
                },
                "source": "moonshot",
                "discovered_at": db.utc_now(),
                "status": "candidate"
            }
            patterns.append(pattern)
        
        return patterns

# Global moonshot discovery instance
moonshot_discovery = MoonshotPatternDiscovery()
