"""Ladder collapse sequence detection."""

from typing import Any, Dict, List, Tuple


class LadderDetector:
    """Detect and analyze ladder collapse sequences within bands."""
    
    def __init__(self, min_length: int = 3) -> None:
        self.min_length = min_length
    
    def detect_ladder_sequences(
        self,
        rounds: List[Dict[str, Any]],
        band_range: Tuple[float, float]
    ) -> Dict[str, Any]:
        """Detect ladder sequences within a band range.
        
        Args:
            rounds: Historical rounds
            band_range: (min_multiplier, max_multiplier) for the band
            
        Returns:
            Dictionary with ladder sequence data
        """
        if not rounds:
            return {
                "sequences": [],
                "collapse_points": [],
                "avg_ladder_length": 0.0,
                "collapse_frequency": 0.0
            }
        
        min_mult, max_mult = band_range
        sequences = []
        current_sequence = []
        
        for round_data in rounds:
            multiplier = round_data["multiplier"]
            
            if min_mult <= multiplier < max_mult:
                current_sequence.append(round_data)
            else:
                # Sequence ended
                if len(current_sequence) >= self.min_length:
                    sequences.append(current_sequence.copy())
                current_sequence = []
        
        # Don't forget the last sequence
        if len(current_sequence) >= self.min_length:
            sequences.append(current_sequence)
        
        # Find collapse points
        collapse_points = self._find_collapse_points(rounds, band_range)
        
        # Calculate statistics
        avg_length = 0.0
        if sequences:
            avg_length = sum(len(s) for s in sequences) / len(sequences)
        
        collapse_freq = 0.0
        if len(rounds) > 0:
            collapse_freq = len(collapse_points) / len(rounds)
        
        return {
            "sequences": sequences,
            "collapse_points": collapse_points,
            "avg_ladder_length": round(avg_length, 2),
            "collapse_frequency": round(collapse_freq, 4),
            "total_sequences": len(sequences)
        }
    
    def _find_collapse_points(
        self,
        rounds: List[Dict[str, Any]],
        band_range: Tuple[float, float]
    ) -> List[Dict[str, Any]]:
        """Find where ladders broke (exited the band).
        
        Args:
            rounds: Historical rounds
            band_range: Band range
            
        Returns:
            List of collapse point data
        """
        min_mult, max_mult = band_range
        collapses = []
        
        for i in range(1, len(rounds)):
            prev_mult = rounds[i-1]["multiplier"]
            curr_mult = rounds[i]["multiplier"]
            
            # Check if we were in the band and then left
            if min_mult <= prev_mult < max_mult and not (min_mult <= curr_mult < max_mult):
                collapses.append({
                    "index": i,
                    "from_multiplier": prev_mult,
                    "to_multiplier": curr_mult,
                    "direction": "up" if curr_mult >= max_mult else "down"
                })
        
        return collapses
    
    def analyze_all_bands(self, rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze ladder sequences for all predefined bands.
        
        Bands to analyze:
        - 2x-3x (ignition)
        - 3x-5x (transition)
        - 5x-10x (moonshot approach)
        - 10x-50x (mega approach)
        - 50x-100x (extreme)
        
        Args:
            rounds: Historical rounds
            
        Returns:
            Dictionary with all band ladder data
        """
        bands = [
            ("ignition", (2.0, 3.0)),
            ("transition", (3.0, 5.0)),
            ("moonshot_approach", (5.0, 10.0)),
            ("mega_approach", (10.0, 50.0)),
            ("extreme", (50.0, 100.0))
        ]
        
        results = {}
        for band_name, band_range in bands:
            results[band_name] = self.detect_ladder_sequences(rounds, band_range)
        
        return results
