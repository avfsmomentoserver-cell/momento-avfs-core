"""Moonshot condition scanner."""

from typing import Any, Dict, List


class MoonshotScanner:
    """Scan for moonshot release conditions."""
    
    def __init__(self, lookback: int = 100) -> None:
        self.lookback = lookback
    
    def scan_moonshot_conditions(
        self,
        rounds: List[Dict[str, Any]],
        linguistics: Dict[str, Any],
        eta_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Scan for moonshot release conditions.
        
        Steps:
        1. Identify moonshot events (multiplier >= 10x)
        2. Analyze pre-moonshot conditions
        3. Build condition patterns
        4. Score current conditions against patterns
        5. Incorporate ETA predictions and hold probability
        
        Args:
            rounds: Historical rounds
            linguistics: Current linguistic factors
            eta_data: ETA predictions from compute_range_eta
            
        Returns:
            Dictionary with moonshot condition analysis
        """
        if not rounds:
            return {"imminent": False, "confidence": 0.0, "factors": {}}
        
        # Identify moonshot events
        moonshot_indices = [
            i for i, r in enumerate(rounds)
            if r["multiplier"] >= 10.0
        ]
        
        if not moonshot_indices:
            return {
                "imminent": False,
                "confidence": 0.0,
                "factors": linguistics,
                "reason": "No historical moonshots"
            }
        
        # Analyze pre-moonshot conditions
        pre_moonshot_patterns = self._analyze_pre_moonshot_conditions(
            rounds, moonshot_indices
        )
        
        # Score current conditions
        current_score = self._score_current_conditions(
            linguistics, pre_moonshot_patterns
        )
        
        # Incorporate ETA data if available
        eta_adjustment = 0.0
        release_window = None
        if eta_data and eta_data.get("range_predictions"):
            # Get ETA for 20x target (most common moonshot threshold)
            eta_20x = next((p for p in eta_data["range_predictions"] if p["target"] == 20.0), None)
            if eta_20x and eta_20x["found"]:
                # Adjust confidence based on hold probability
                hold_prob = eta_20x.get("hold_probability", 0.5)
                eta_adjustment = (hold_prob - 0.5) * 0.2  # ±10% adjustment
                release_window = eta_20x.get("release_window")
        
        adjusted_confidence = min(1.0, max(0.0, current_score + eta_adjustment))
        
        return {
            "imminent": adjusted_confidence > 0.7,
            "confidence": round(adjusted_confidence, 2),
            "factors": linguistics,
            "patterns": pre_moonshot_patterns,
            "historical_moonshots": len(moonshot_indices),
            "eta_data": eta_data,
            "release_window": release_window,
            "eta_adjustment": round(eta_adjustment, 3)
        }
    
    def _analyze_pre_moonshot_conditions(
        self,
        rounds: List[Dict[str, Any]],
        moonshot_indices: List[int]
    ) -> Dict[str, Any]:
        """Analyze conditions before historical moonshots.
        
        Args:
            rounds: Historical rounds
            moonshot_indices: Indices of moonshot events
            
        Returns:
            Dictionary with pattern data
        """
        patterns = {
            "avg_pressure_before": 0.0,
            "avg_compression_before": 0.0,
            "avg_distance_20x_before": 0.0,
            "band_transition_before": []
        }
        
        lookback = 10  # Look at 10 rounds before each moonshot
        
        for idx in moonshot_indices:
            start = max(0, idx - lookback)
            pre_rounds = rounds[start:idx]
            
            if pre_rounds:
                # Calculate average multiplier before moonshot
                avg_mult = sum(r["multiplier"] for r in pre_rounds) / len(pre_rounds)
                
                # Simple pattern: higher average before moonshot
                patterns["avg_pressure_before"] += avg_mult
                
                # Count band transitions
                bands = [r.get("band", "low") for r in pre_rounds]
                transitions = sum(1 for i in range(1, len(bands)) if bands[i] != bands[i-1])
                patterns["band_transition_before"].append(transitions)
        
        # Calculate averages
        if moonshot_indices:
            patterns["avg_pressure_before"] /= len(moonshot_indices)
            if patterns["band_transition_before"]:
                patterns["avg_transitions"] = sum(patterns["band_transition_before"]) / len(patterns["band_transition_before"])
        
        return patterns
    
    def _score_current_conditions(
        self,
        linguistics: Dict[str, Any],
        patterns: Dict[str, Any]
    ) -> float:
        """Score current conditions against historical patterns.
        
        Args:
            linguistics: Current linguistic factors
            patterns: Historical patterns
            
        Returns:
            Score (0-1)
        """
        score = 0.0
        
        # Pressure factor
        pressure = linguistics.get("pressure", 0.0)
        score += pressure * 0.3  # 30% weight
        
        # Compression factor
        compression = linguistics.get("compression", 0.0)
        score += compression * 0.2  # 20% weight
        
        # Ceiling proximity
        ceiling_prox = linguistics.get("ceiling_proximity", 0.0)
        score += ceiling_prox * 0.2  # 20% weight
        
        # Band transition trend
        band_data = linguistics.get("band_transition", {})
        if band_data.get("trend") == "upward":
            score += 0.2  # 20% weight
        elif band_data.get("trend") == "mixed":
            score += 0.1
        
        # Distance from last moonshot (closer = higher score)
        dist_10x = linguistics.get("momentum_distance_10x", {})
        if dist_10x.get("found", False):
            distance = dist_10x.get("distance", 100)
            # Closer distance = higher score
            distance_score = 1.0 / (distance / 10.0 + 1.0)
            score += distance_score * 0.1  # 10% weight
        
        return min(score, 1.0)
