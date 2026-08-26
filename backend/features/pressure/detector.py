"""Resistance ceiling detection for pressure analysis."""

import logging
from typing import Any, Dict, List

logger = logging.getLogger("features.pressure.detector")


class CeilingDetector:
    """Detect resistance ceilings from historical multiplier data."""
    
    def __init__(self, min_touches: int = 3, tolerance: float = 0.05) -> None:
        self.min_touches = min_touches
        self.tolerance = tolerance
    
    def detect_resistance_ceilings(
        self,
        rounds: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Detect resistance ceilings where multipliers reverse.
        
        Steps:
        1. Find local maxima in multiplier sequence
        2. Cluster nearby maxima into ceiling levels
        3. Count touches per ceiling
        4. Classify ceiling archetype
        5. Filter by minimum touches
        
        Args:
            rounds: List of round dictionaries
            
        Returns:
            List of ceiling dictionaries
        """
        if not rounds:
            return []
        
        # Extract multipliers
        multipliers = [float(r["multiplier"]) for r in rounds]
        
        # Find local maxima
        maxima_indices = self._find_local_maxima(multipliers)
        
        if not maxima_indices:
            return []
        
        # Cluster maxima into ceiling levels
        ceiling_clusters = self._cluster_maxima(multipliers, maxima_indices)
        
        # Build ceiling objects
        ceilings = []
        for level, indices in ceiling_clusters.items():
            if len(indices) >= self.min_touches:
                ceiling = {
                    "level": round(level, 2),
                    "touches": len(indices),
                    "first_touch_index": min(indices),
                    "last_touch_index": max(indices),
                    "touch_indices": indices,
                    "touch_multipliers": [multipliers[i] for i in indices]
                }
                
                # Classify archetype
                archetype = self._classify_ceiling_archetype(
                    [multipliers[i] for i in indices],
                    indices
                )
                ceiling["archetype"] = archetype
                
                ceilings.append(ceiling)
        
        # Sort by level
        ceilings.sort(key=lambda c: c["level"])
        
        return ceilings
    
    def _find_local_maxima(self, multipliers: List[float]) -> List[int]:
        """Find local maxima in multiplier sequence.
        
        A point is a local maximum if it's greater than its neighbors.
        
        Args:
            multipliers: List of multiplier values
            
        Returns:
            List of indices where maxima occur
        """
        maxima = []
        
        for i in range(1, len(multipliers) - 1):
            if multipliers[i] > multipliers[i-1] and multipliers[i] > multipliers[i+1]:
                maxima.append(i)
        
        return maxima
    
    def _cluster_maxima(
        self,
        multipliers: List[float],
        maxima_indices: List[int]
    ) -> Dict[float, List[int]]:
        """Cluster nearby maxima into ceiling levels with running-mean centers.

        The previous implementation pinned each cluster to its *first* maxima
        value, making the result order-dependent: two maxima that are each
        within tolerance of the cluster center but far from each other would
        still merge, while a maxima that is close to the running mean but not
        the first value could be missed.

        Fix: after each addition, recompute the cluster center as the mean of
        all member values and re-key the dictionary.  This produces stable,
        order-independent clusters.

        Args:
            multipliers: List of multiplier values
            maxima_indices: Indices of local maxima

        Returns:
            Dictionary mapping ceiling level to list of indices
        """
        clusters: Dict[float, List[int]] = {}

        for idx in maxima_indices:
            value = multipliers[idx]

            # Find the closest existing cluster within tolerance
            found_key: float | None = None
            found_distance = float("inf")
            for level in list(clusters.keys()):
                dist = abs(value - level)
                if dist <= self.tolerance * level and dist < found_distance:
                    found_key = level
                    found_distance = dist

            if found_key is not None:
                clusters[found_key].append(idx)

                # Recompute center as the mean of all member values
                cluster_values = [multipliers[i] for i in clusters[found_key]]
                new_center = sum(cluster_values) / len(cluster_values)

                # Re-key the dictionary to the updated center
                if abs(new_center - found_key) > 1e-12:
                    cluster_indices = clusters.pop(found_key)
                    clusters[new_center] = cluster_indices
            else:
                clusters[value] = [idx]

        return clusters
    
    def _classify_ceiling_archetype(
        self,
        touch_values: List[float],
        touch_indices: List[int]
    ) -> str:
        """Classify ceiling pattern.
        
        Archetypes:
        - Ascending: Ceiling level increases over time
        - Descending: Ceiling level decreases over time
        - Stable: Ceiling level remains relatively constant
        
        Args:
            touch_values: Multiplier values at touches
            touch_indices: Indices of touches (for time ordering)
            
        Returns:
            Archetype string
        """
        if len(touch_values) < 2:
            return "stable"
        
        # Sort by index to get chronological order
        sorted_touches = sorted(zip(touch_indices, touch_values))
        values = [v for _, v in sorted_touches]
        
        # Calculate trend using linear regression
        n = len(values)
        x = list(range(n))
        
        # Calculate slope
        sum_x = sum(x)
        sum_y = sum(values)
        sum_xy = sum(xi * yi for xi, yi in zip(x, values))
        sum_x2 = sum(xi ** 2 for xi in x)
        
        if n * sum_x2 - sum_x ** 2 == 0:
            return "stable"
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
        
        # Calculate R-squared to determine significance
        y_mean = sum_y / n
        ss_tot = sum((yi - y_mean) ** 2 for yi in values)
        
        if ss_tot == 0:
            return "stable"
        
        y_pred = [slope * xi + (sum_y - slope * sum_x) / n for xi in x]
        ss_res = sum((yi - ypi) ** 2 for yi, ypi in zip(values, y_pred))
        
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        
        # Classify based on slope and significance
        if r_squared < 0.3:
            return "stable"
        elif slope > 0.01:
            return "ascending"
        elif slope < -0.01:
            return "descending"
        else:
            return "stable"
