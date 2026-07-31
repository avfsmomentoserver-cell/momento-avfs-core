"""New linguistic patterns for moonshot prediction."""

from datetime import datetime
from typing import Any, Dict, List


class MoonshotLinguistics:
    """Compute linguistic factors for moonshot prediction."""
    
    def __init__(self) -> None:
        self.lookback_window = 100
    
    def compute_pressure_factor(
        self,
        pressure_data: Dict[str, Any]
    ) -> float:
        """Extract pressure factor from pressure plugin data.
        
        Args:
            pressure_data: Pressure computation results
            
        Returns:
            Pressure factor (0-1)
        """
        return pressure_data.get("pressure_percent", 0.0) / 100.0
    
    def compute_momentum_distance(
        self,
        rounds: List[Dict[str, Any]],
        target_multiplier: float,
        metric: str = "rounds"
    ) -> Dict[str, Any]:
        """Compute distance from last occurrence of target multiplier.
        
        Metrics:
        - rounds: Number of rounds since last occurrence
        - time: Time elapsed since last occurrence
        - compression: Average multiplier since last occurrence
        
        Args:
            rounds: Historical rounds
            target_multiplier: Target multiplier to find
            metric: Distance metric to use
            
        Returns:
            Dictionary with distance metrics
        """
        if not rounds:
            return {"distance": 0, "metric": metric, "found": False}
        
        # Find last occurrence of target multiplier
        last_index = -1
        for i in range(len(rounds) - 1, -1, -1):
            if rounds[i]["multiplier"] >= target_multiplier:
                last_index = i
                break
        
        if last_index == -1:
            return {"distance": len(rounds), "metric": metric, "found": False}
        
        rounds_since = len(rounds) - 1 - last_index
        
        if metric == "rounds":
            return {"distance": rounds_since, "metric": metric, "found": True}
        
        elif metric == "time":
            # Calculate time elapsed
            if last_index < len(rounds) - 1:
                last_time = datetime.fromisoformat(
                    rounds[last_index]["timestamp"].replace("Z", "+00:00")
                )
                current_time = datetime.fromisoformat(
                    rounds[-1]["timestamp"].replace("Z", "+00:00")
                )
                time_elapsed = (current_time - last_time).total_seconds()
                return {"distance": time_elapsed, "metric": metric, "found": True}
            return {"distance": 0, "metric": metric, "found": True}
        
        elif metric == "compression":
            # Calculate average multiplier since last occurrence
            recent_rounds = rounds[last_index:]
            if recent_rounds:
                avg_mult = sum(r["multiplier"] for r in recent_rounds) / len(recent_rounds)
                return {"distance": avg_mult, "metric": metric, "found": True}
            return {"distance": 0, "metric": metric, "found": True}
        
        return {"distance": rounds_since, "metric": metric, "found": True}
    
    def compute_range_eta(
        self,
        rounds: List[Dict[str, Any]],
        target_ranges: List[float] = None
    ) -> Dict[str, Any]:
        """Compute ETA predictions for multiple target ranges with hold probability.
        
        For each target range, calculates:
        - Expected rounds until hit
        - Hold probability (will prediction hold for 1-3 rounds?)
        - Confidence based on historical accuracy
        - Release window (min-max expected rounds)
        
        Args:
            rounds: Historical rounds
            target_ranges: List of target multipliers (default: [12, 20, 30, 50])
            
        Returns:
            Dictionary with ETA predictions for each range
        """
        if target_ranges is None:
            target_ranges = [12.0, 20.0, 30.0, 50.0]
        
        if not rounds or len(rounds) < 20:
            return {
                "range_predictions": [],
                "overall_confidence": 0.0,
                "note": "Insufficient data for ETA prediction"
            }
        
        import statistics
        
        range_predictions = []
        
        for target in target_ranges:
            # Find all occurrences of this target
            hit_indices = [i for i, r in enumerate(rounds) if r["multiplier"] >= target]
            
            if not hit_indices:
                # Never hit this target
                range_predictions.append({
                    "target": target,
                    "expected_rounds": None,
                    "hold_probability": 0.0,
                    "confidence": 0.0,
                    "release_window": None,
                    "rounds_since": len(rounds),
                    "found": False
                })
                continue
            
            # Calculate gaps between hits
            gaps = []
            for i in range(1, len(hit_indices)):
                gaps.append(hit_indices[i] - hit_indices[i-1])
            
            # Expected rounds (average gap)
            expected_rounds = statistics.mean(gaps) if gaps else None
            
            # Calculate hold probability - how often does prediction hold for 1-3 rounds?
            hold_count = 0
            total_opportunities = 0
            
            for idx in hit_indices[:-1]:  # Exclude last hit (no future data)
                # Check if there were "near misses" in the 3 rounds before hit
                window_start = max(0, idx - 3)
                pre_hit_rounds = rounds[window_start:idx]
                
                # Count how many were close (within 20% of target)
                close_rounds = sum(1 for r in pre_hit_rounds if r["multiplier"] >= target * 0.8)
                
                if close_rounds > 0:
                    total_opportunities += 1
                    # If it held through close rounds to actual hit, count as hold
                    hold_count += 1
            
            hold_probability = hold_count / total_opportunities if total_opportunities > 0 else 0.5
            
            # Confidence based on data quantity
            confidence = min(1.0, len(hit_indices) / 20.0)
            
            # Release window (min-max gap)
            release_window = {
                "min": min(gaps) if gaps else None,
                "max": max(gaps) if gaps else None,
                "std": statistics.stdev(gaps) if len(gaps) > 1 else None
            } if gaps else None
            
            # Rounds since last hit
            rounds_since = len(rounds) - 1 - hit_indices[-1]
            
            range_predictions.append({
                "target": target,
                "expected_rounds": round(expected_rounds, 1) if expected_rounds else None,
                "hold_probability": round(hold_probability, 2),
                "confidence": round(confidence, 2),
                "release_window": release_window,
                "rounds_since": rounds_since,
                "found": True,
                "hit_count": len(hit_indices)
            })
        
        # Overall confidence (weighted by target importance)
        weights = {12: 0.2, 20: 0.3, 30: 0.3, 50: 0.2}
        overall_confidence = 0.0
        total_weight = 0.0
        
        for pred in range_predictions:
            if pred["found"]:
                weight = weights.get(pred["target"], 0.25)
                overall_confidence += pred["confidence"] * weight
                total_weight += weight
        
        overall_confidence = overall_confidence / total_weight if total_weight > 0 else 0.0
        
        return {
            "range_predictions": range_predictions,
            "overall_confidence": round(overall_confidence, 2),
            "note": f"ETA predictions based on {len(rounds)} rounds of history"
        }
    
    def compute_ceiling_proximity(
        self,
        current_multiplier: float,
        ceilings: List[Dict[str, Any]]
    ) -> float:
        """Compute distance to nearest resistance ceiling.
        
        Args:
            current_multiplier: Current multiplier
            ceilings: List of resistance ceilings
            
        Returns:
            Proximity factor (0-1, higher = closer to ceiling)
        """
        if not ceilings:
            return 0.0
        
        # Find nearest ceiling above current multiplier
        nearest_ceiling = None
        min_distance = float('inf')
        
        for ceiling in ceilings:
            level = ceiling["level"]
            if level > current_multiplier:
                distance = level - current_multiplier
                if distance < min_distance:
                    min_distance = distance
                    nearest_ceiling = ceiling
        
        if nearest_ceiling is None:
            return 0.0
        
        # Convert distance to proximity factor
        # Closer = higher proximity
        proximity = 1.0 / (min_distance + 1.0)
        return min(proximity, 1.0)
    
    def compute_band_transition(
        self,
        rounds: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze recent band transitions.
        
        Args:
            rounds: Recent rounds
            
        Returns:
            Dictionary with band transition data
        """
        if not rounds:
            return {"transitions": [], "current_band": "unknown", "trend": "stable"}
        
        # Get recent bands
        recent_bands = [r.get("band", "low") for r in rounds[-20:]]
        
        # Count transitions
        transitions = []
        for i in range(1, len(recent_bands)):
            if recent_bands[i] != recent_bands[i-1]:
                transitions.append({
                    "from": recent_bands[i-1],
                    "to": recent_bands[i],
                    "index": i
                })
        
        # Determine trend
        if not transitions:
            trend = "stable"
        else:
            # Check if trending upward (low -> ignition -> moonshot)
            upward_moves = sum(1 for t in transitions if self._is_upward_move(t))
            if upward_moves > len(transitions) / 2:
                trend = "upward"
            else:
                trend = "mixed"
        
        return {
            "transitions": transitions,
            "current_band": recent_bands[-1],
            "trend": trend,
            "transition_count": len(transitions)
        }
    
    def _is_upward_move(self, transition: Dict[str, Any]) -> bool:
        """Check if transition is upward (low -> ignition -> moonshot)."""
        band_order = {"low": 0, "ignition": 1, "moonshot": 2, "mega": 3}
        from_band = transition.get("from", "low")
        to_band = transition.get("to", "low")
        return band_order.get(to_band, 0) > band_order.get(from_band, 0)
    
    def compute_compression(
        self,
        rounds: List[Dict[str, Any]],
        window: int = 20
    ) -> float:
        """Compute how compressed recent multipliers have been.
        
        Args:
            rounds: Recent rounds
            window: Window size
            
        Returns:
            Compression factor (0-1, higher = more compressed)
        """
        if len(rounds) < window:
            return 0.0
        
        recent_multipliers = [r["multiplier"] for r in rounds[-window:]]
        
        # Calculate standard deviation
        import statistics
        if len(recent_multipliers) < 2:
            return 0.0
        
        stdev = statistics.pstdev(recent_multipliers)
        mean = statistics.mean(recent_multipliers)
        
        if mean == 0:
            return 0.0
        
        # Coefficient of variation (normalized compression)
        cv = stdev / mean
        
        # Convert to compression factor (lower CV = higher compression)
        compression = 1.0 / (cv + 1.0)
        return min(compression, 1.0)
    
    def compute_all_linguistics(
        self,
        rounds: List[Dict[str, Any]],
        pressure_data: Dict[str, Any],
        ceilings: List[Dict[str, Any]],
        include_eta: bool = True
    ) -> Dict[str, Any]:
        """Compute all linguistic factors.
        
        Args:
            rounds: Historical rounds
            pressure_data: Pressure computation results
            ceilings: Resistance ceilings
            include_eta: Whether to compute ETA predictions
            
        Returns:
            Dictionary with all linguistic factors
        """
        if not rounds:
            return {}
        
        current_multiplier = rounds[-1]["multiplier"]
        
        result = {
            "pressure": self.compute_pressure_factor(pressure_data),
            "momentum_distance_20x": self.compute_momentum_distance(rounds, 20.0, "rounds"),
            "momentum_distance_10x": self.compute_momentum_distance(rounds, 10.0, "rounds"),
            "ceiling_proximity": self.compute_ceiling_proximity(current_multiplier, ceilings),
            "band_transition": self.compute_band_transition(rounds),
            "compression": self.compute_compression(rounds)
        }
        
        # Add ETA predictions if requested
        if include_eta:
            result["eta_predictions"] = self.compute_range_eta(rounds)
        
        return result
    
    def compute_sweet_spot_score(
        self,
        rounds: List[Dict[str, Any]],
        linguistics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compute sweet spot score - when all factors meet release conditions.
        
        Combines: pressure + compression + ceiling_proximity + 
        band_transition + momentum_distance + exhaustion
        
        Args:
            rounds: Historical rounds
            linguistics: Current linguistic factors
            
        Returns:
            Dictionary with sweet spot analysis
        """
        if not rounds or not linguistics:
            return {
                "sweet_spot_score": 0.0,
                "conditions_met": [],
                "conditions_failed": [],
                "overall_score": 0.0
            }
        
        conditions = []
        
        # Pressure condition (high pressure is good)
        pressure = linguistics.get("pressure", 0.0)
        pressure_met = pressure >= 0.6
        conditions.append({
            "name": "pressure",
            "value": pressure,
            "threshold": 0.6,
            "met": pressure_met,
            "weight": 0.25
        })
        
        # Compression condition (high compression is good)
        compression = linguistics.get("compression", 0.0)
        compression_met = compression >= 0.5
        conditions.append({
            "name": "compression",
            "value": compression,
            "threshold": 0.5,
            "met": compression_met,
            "weight": 0.20
        })
        
        # Ceiling proximity (close to ceiling is good)
        ceiling_prox = linguistics.get("ceiling_proximity", 0.0)
        ceiling_met = ceiling_prox >= 0.4
        conditions.append({
            "name": "ceiling_proximity",
            "value": ceiling_prox,
            "threshold": 0.4,
            "met": ceiling_met,
            "weight": 0.15
        })
        
        # Band transition (upward trend is good)
        band_data = linguistics.get("band_transition", {})
        band_trend = band_data.get("trend", "stable")
        band_met = band_trend == "upward"
        band_score = 1.0 if band_met else (0.5 if band_trend == "mixed" else 0.0)
        conditions.append({
            "name": "band_transition",
            "value": band_score,
            "threshold": 0.8,
            "met": band_met,
            "weight": 0.15
        })
        
        # Momentum distance (closer to last moonshot is better)
        momentum_20x = linguistics.get("momentum_distance_20x", {})
        if momentum_20x.get("found", False):
            distance = momentum_20x.get("distance", 100)
            # Closer distance = higher score (inverse relationship)
            momentum_score = 1.0 / (distance / 20.0 + 1.0)
            momentum_met = momentum_score >= 0.3
        else:
            momentum_score = 0.0
            momentum_met = False
        conditions.append({
            "name": "momentum_distance",
            "value": momentum_score,
            "threshold": 0.3,
            "met": momentum_met,
            "weight": 0.15
        })
        
        # Calculate weighted score
        weighted_score = sum(
            cond["value"] * cond["weight"] for cond in conditions
        )
        
        # Sweet spot is when most conditions are met
        conditions_met = [c for c in conditions if c["met"]]
        conditions_failed = [c for c in conditions if not c["met"]]
        
        # Sweet spot score: combination of weighted score and condition count
        met_ratio = len(conditions_met) / len(conditions) if conditions else 0.0
        sweet_spot_score = (weighted_score * 0.6) + (met_ratio * 0.4)
        
        return {
            "sweet_spot_score": round(sweet_spot_score, 3),
            "conditions_met": conditions_met,
            "conditions_failed": conditions_failed,
            "overall_score": round(weighted_score, 3),
            "met_ratio": round(met_ratio, 3)
        }
    
    def compute_release_conditions(
        self,
        rounds: List[Dict[str, Any]],
        linguistics: Dict[str, Any],
        thresholds: Dict[str, float] = None
    ) -> Dict[str, Any]:
        """Test if ALL factors meet release conditions.
        
        Args:
            rounds: Historical rounds
            linguistics: Current linguistic factors
            thresholds: Custom thresholds (uses defaults if None)
            
        Returns:
            Dictionary with release condition analysis
        """
        if thresholds is None:
            # Optimized thresholds from backtesting (F1: 0.3071, Recall: 0.8592)
            thresholds = {
                "pressure": 0.1,
                "compression": 0.1,
                "ceiling_proximity": 0.1,
                "momentum_distance": 0.1,
                "band_transition": 0.3
            }
        
        if not linguistics:
            return {
                "all_conditions_met": False,
                "conditions_status": {},
                "overall_score": 0.0
            }
        
        conditions_status = {}
        
        # Check each condition
        pressure = linguistics.get("pressure", 0.0)
        conditions_status["pressure"] = {
            "value": pressure,
            "threshold": thresholds["pressure"],
            "met": pressure >= thresholds["pressure"]
        }
        
        compression = linguistics.get("compression", 0.0)
        conditions_status["compression"] = {
            "value": compression,
            "threshold": thresholds["compression"],
            "met": compression >= thresholds["compression"]
        }
        
        ceiling_prox = linguistics.get("ceiling_proximity", 0.0)
        conditions_status["ceiling_proximity"] = {
            "value": ceiling_prox,
            "threshold": thresholds["ceiling_proximity"],
            "met": ceiling_prox >= thresholds["ceiling_proximity"]
        }
        
        momentum_20x = linguistics.get("momentum_distance_20x", {})
        if momentum_20x.get("found", False):
            distance = momentum_20x.get("distance", 100)
            momentum_score = 1.0 / (distance / 20.0 + 1.0)
        else:
            momentum_score = 0.0
        conditions_status["momentum_distance"] = {
            "value": momentum_score,
            "threshold": thresholds["momentum_distance"],
            "met": momentum_score >= thresholds["momentum_distance"]
        }
        
        band_data = linguistics.get("band_transition", {})
        band_trend = band_data.get("trend", "stable")
        band_score = 1.0 if band_trend == "upward" else (0.5 if band_trend == "mixed" else 0.0)
        conditions_status["band_transition"] = {
            "value": band_score,
            "threshold": thresholds["band_transition"],
            "met": band_score >= thresholds["band_transition"]
        }
        
        # Check if all conditions met
        all_met = all(status["met"] for status in conditions_status.values())
        
        # Calculate overall score (average of all condition scores normalized to thresholds)
        overall_score = sum(
            min(1.0, status["value"] / status["threshold"]) 
            for status in conditions_status.values()
        ) / len(conditions_status)
        
        return {
            "all_conditions_met": all_met,
            "conditions_status": conditions_status,
            "overall_score": round(overall_score, 3),
            "met_count": sum(1 for s in conditions_status.values() if s["met"]),
            "total_count": len(conditions_status)
        }
    
    def compute_chase_readiness(
        self,
        rounds: List[Dict[str, Any]],
        linguistics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compute chase readiness - should we enter chase strategy now?
        
        Factors: ladder strength, compression, hold probability
        
        Args:
            rounds: Historical rounds
            linguistics: Current linguistic factors
            
        Returns:
            Dictionary with chase readiness analysis
        """
        if not rounds or not linguistics:
            return {
                "chase_ready": False,
                "readiness_score": 0.0,
                "factors": {}
            }
        
        factors = {}
        
        # Ladder strength (from ascending ladder)
        # This would need to be computed from the rounds directly
        # For now, use compression as a proxy
        compression = linguistics.get("compression", 0.0)
        factors["compression"] = {
            "value": compression,
            "weight": 0.4,
            "score": compression
        }
        
        # Hold probability from ETA data
        eta_data = linguistics.get("eta_predictions", {})
        range_preds = eta_data.get("range_predictions", [])
        hold_prob = 0.0
        if range_preds:
            # Get hold probability for 20x target
            eta_20x = next((p for p in range_preds if p["target"] == 20.0), None)
            if eta_20x:
                hold_prob = eta_20x.get("hold_probability", 0.5)
        
        factors["hold_probability"] = {
            "value": hold_prob,
            "weight": 0.35,
            "score": hold_prob
        }
        
        # Pressure as additional factor
        pressure = linguistics.get("pressure", 0.0)
        factors["pressure"] = {
            "value": pressure,
            "weight": 0.25,
            "score": pressure
        }
        
        # Calculate weighted readiness score
        readiness_score = sum(
            f["score"] * f["weight"] for f in factors.values()
        )
        
        # Chase ready if score is high enough
        chase_ready = readiness_score >= 0.65
        
        return {
            "chase_ready": chase_ready,
            "readiness_score": round(readiness_score, 3),
            "factors": factors,
            "recommendation": "ENTER" if chase_ready else "WAIT"
        }
