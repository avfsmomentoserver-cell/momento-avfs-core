"""Band relativity and dynamic band definition."""

from typing import Any, Dict, List
import statistics


class BandRelativity:
    """Compute band relativity and dynamic band definitions."""
    
    def __init__(self) -> None:
        self.band_order = ["low", "ignition", "moonshot", "mega"]
    
    def compute_band_relativity(self, rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compute how bands relate to each other.
        
        Returns:
        - transition_matrix: Probability of band transitions
        - correlation_matrix: Correlation between band activities
        - lead_lag_relationships: Which bands lead others
        - synchronization: How synchronized bands are
        
        Args:
            rounds: Historical rounds
            
        Returns:
            Dictionary with relativity metrics
        """
        if not rounds:
            return {
                "transition_matrix": {},
                "correlation_matrix": {},
                "lead_lag": {},
                "synchronization": 0.0
            }
        
        # Get band sequence
        bands = [r.get("band", "low") for r in rounds]
        
        # Compute transition matrix
        transition_matrix = self._compute_transition_matrix(bands)
        
        # Compute correlation matrix (simplified - using transition frequencies)
        correlation_matrix = self._compute_correlation_matrix(transition_matrix)
        
        # Compute lead-lag relationships
        lead_lag = self._compute_lead_lag(rounds)
        
        # Compute overall synchronization
        synchronization = self._compute_synchronization(transition_matrix)
        
        return {
            "transition_matrix": transition_matrix,
            "correlation_matrix": correlation_matrix,
            "lead_lag": lead_lag,
            "synchronization": round(synchronization, 4)
        }
    
    def _compute_transition_matrix(self, bands: List[str]) -> Dict[str, Dict[str, float]]:
        """Compute probability of band transitions.
        
        Args:
            bands: List of band names
            
        Returns:
            Transition probability matrix
        """
        transitions: Dict[str, Dict[str, float]] = {}
        
        # Initialize matrix
        for band in self.band_order:
            transitions[band] = {b: 0.0 for b in self.band_order}
        
        # Count transitions
        for i in range(1, len(bands)):
            from_band = bands[i-1]
            to_band = bands[i]
            
            if from_band in transitions and to_band in transitions[from_band]:
                transitions[from_band][to_band] += 1
        
        # Normalize to probabilities
        for from_band in transitions:
            total = sum(transitions[from_band].values())
            if total > 0:
                for to_band in transitions[from_band]:
                    transitions[from_band][to_band] /= total
        
        return transitions
    
    def _compute_correlation_matrix(
        self,
        transition_matrix: Dict[str, Dict[str, float]]
    ) -> Dict[str, Dict[str, float]]:
        """Compute correlation between band activities.
        
        Args:
            transition_matrix: Transition probability matrix
            
        Returns:
            Correlation matrix
        """
        correlation = {}
        
        for band1 in self.band_order:
            correlation[band1] = {}
            for band2 in self.band_order:
                if band1 == band2:
                    correlation[band1][band2] = 1.0
                else:
                    # Use transition probability as correlation proxy
                    correlation[band1][band2] = transition_matrix.get(band1, {}).get(band2, 0.0)
        
        return correlation
    
    def _compute_lead_lag(self, rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compute which bands lead others.
        
        Args:
            rounds: Historical rounds
            
        Returns:
            Lead-lag relationship data
        """
        # Simplified: check if band transitions tend to follow patterns
        lead_lag = {}
        
        for i in range(len(self.band_order) - 1):
            current_band = self.band_order[i]
            next_band = self.band_order[i + 1]
            
            lead_lag[f"{current_band}_to_{next_band}"] = {
                "leads": True,
                "strength": 0.5  # Placeholder - would need more sophisticated analysis
            }
        
        return lead_lag
    
    def _compute_synchronization(
        self,
        transition_matrix: Dict[str, Dict[str, float]]
    ) -> float:
        """Compute overall synchronization between bands.
        
        Args:
            transition_matrix: Transition probability matrix
            
        Returns:
            Synchronization score (0-1)
        """
        # Calculate entropy of transition matrix
        total_entropy = 0.0
        count = 0
        
        for from_band in transition_matrix:
            for prob in transition_matrix[from_band].values():
                if prob > 0:
                    total_entropy += -prob * (prob if prob < 1 else 0)  # Simplified entropy
                    count += 1
        
        if count == 0:
            return 0.0
        
        # Normalize
        return min(total_entropy / count, 1.0)
    
    def define_dynamic_bands(
        self,
        ceilings: List[Dict[str, Any]],
        round_distribution: List[float]
    ) -> Dict[str, Any]:
        """Define bands dynamically based on ceilings and distribution.
        
        Args:
            ceilings: Resistance ceilings
            round_distribution: Multiplier distribution
            
        Returns:
            Dynamic band definitions
        """
        if not ceilings:
            return self._get_default_bands()
        
        # Sort ceilings by level
        sorted_ceilings = sorted(ceilings, key=lambda c: c["level"])
        
        # Define bands between ceilings
        bands = []
        boundaries = [1.0]  # Start at 1.0x
        
        for ceiling in sorted_ceilings:
            boundaries.append(ceiling["level"])
        
        boundaries.append(100.0)  # Cap at 100x
        
        # Create band definitions
        for i in range(len(boundaries) - 1):
            bands.append({
                "name": f"band_{i}",
                "min_multiplier": boundaries[i],
                "max_multiplier": boundaries[i + 1],
                "strength": self._calculate_band_strength(
                    boundaries[i], boundaries[i + 1], round_distribution
                )
            })
        
        return {
            "bands": bands,
            "band_boundaries": boundaries,
            "dynamic": True
        }
    
    def _get_default_bands(self) -> Dict[str, Any]:
        """Get default static band definitions.
        
        Returns:
            Default band definitions
        """
        return {
            "bands": [
                {"name": "low", "min_multiplier": 1.0, "max_multiplier": 2.0, "strength": 1.0},
                {"name": "ignition", "min_multiplier": 2.0, "max_multiplier": 5.0, "strength": 1.0},
                {"name": "moonshot", "min_multiplier": 5.0, "max_multiplier": 10.0, "strength": 1.0},
                {"name": "mega", "min_multiplier": 10.0, "max_multiplier": 100.0, "strength": 1.0}
            ],
            "band_boundaries": [1.0, 2.0, 5.0, 10.0, 100.0],
            "dynamic": False
        }
    
    def _calculate_band_strength(
        self,
        min_mult: float,
        max_mult: float,
        distribution: List[float]
    ) -> float:
        """Calculate strength of a band based on multiplier distribution.
        
        Args:
            min_mult: Minimum multiplier for band
            max_mult: Maximum multiplier for band
            distribution: Multiplier distribution
            
        Returns:
            Band strength (0-1)
        """
        if not distribution:
            return 0.5
        
        # Count multipliers in this band
        count = sum(1 for m in distribution if min_mult <= m < max_mult)
        
        # Strength based on frequency
        strength = count / len(distribution)
        
        return min(strength, 1.0)
