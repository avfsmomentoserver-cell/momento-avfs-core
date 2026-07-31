"""Multiplier conversion to equal baseline scale."""

import math
from typing import List


class MultiplierConverter:
    """Convert multipliers to equal baseline scale for momentum analysis."""
    
    def __init__(self, min_mult: float = 1.0, max_mult: float = 50.0) -> None:
        self.min_mult = min_mult
        self.max_mult = max_mult
    
    def convert_multiplier_to_baseline(self, multiplier: float) -> float:
        """Convert multiplier to -100 to +100 scale.
        
        Formula:
        normalized = log(multiplier) / log(max_mult)
        baseline = (normalized - 0.5) * 200
        
        This gives:
        - 1.0x -> -100%
        - sqrt(50)x -> 0%
        - 50x -> +100%
        
        Args:
            multiplier: Multiplier value
            
        Returns:
            Baseline value (-100 to +100)
        """
        if multiplier < self.min_mult:
            return -100.0
        if multiplier > self.max_mult:
            return 100.0
        
        normalized = math.log(multiplier) / math.log(self.max_mult)
        baseline = (normalized - 0.5) * 200
        return round(baseline, 2)
    
    def convert_multipliers_to_baseline(self, multipliers: List[float]) -> List[float]:
        """Convert list of multipliers to baseline scale.
        
        Args:
            multipliers: List of multiplier values
            
        Returns:
            List of baseline values
        """
        return [self.convert_multiplier_to_baseline(m) for m in multipliers]
    
    def baseline_to_multiplier(self, baseline: float) -> float:
        """Convert baseline value back to multiplier.
        
        Args:
            baseline: Baseline value (-100 to +100)
            
        Returns:
            Multiplier value
        """
        normalized = (baseline / 200.0) + 0.5
        multiplier = self.max_mult ** normalized
        return round(multiplier, 2)
