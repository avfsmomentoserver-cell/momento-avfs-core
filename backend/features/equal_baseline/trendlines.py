"""Trendline computation for momentum shift detection."""

from typing import Dict, List


class TrendlineComputer:
    """Compute trendlines for momentum analysis."""
    
    def __init__(self, window: int = 20) -> None:
        self.window = window
    
    def moving_average(self, values: List[float], window: int) -> List[float]:
        """Compute simple moving average.
        
        Args:
            values: List of values
            window: Window size
            
        Returns:
            List of moving average values
        """
        if not values or window <= 0:
            return []
        
        ma = []
        for i in range(len(values)):
            start = max(0, i - window + 1)
            window_values = values[start:i+1]
            ma.append(sum(window_values) / len(window_values))
        
        return ma
    
    def compute_trendlines(self, baseline_values: List[float]) -> Dict[str, List[float]]:
        """Compute trendlines using moving averages.
        
        Returns:
        - short_trend: Fast moving average (momentum)
        - long_trend: Slow moving average (trend)
        - momentum: Difference between short and long
        
        Args:
            baseline_values: List of baseline values
            
        Returns:
            Dictionary with trendline data
        """
        if not baseline_values:
            return {
                "short_trend": [],
                "long_trend": [],
                "momentum": []
            }
        
        short_window = max(2, self.window // 2)
        long_window = self.window
        
        short_trend = self.moving_average(baseline_values, short_window)
        long_trend = self.moving_average(baseline_values, long_window)
        
        # Calculate momentum as difference
        momentum = [s - l for s, l in zip(short_trend, long_trend)]
        
        return {
            "short_trend": short_trend,
            "long_trend": long_trend,
            "momentum": momentum
        }
    
    def detect_momentum_shifts(
        self,
        momentum: List[float],
        threshold: float = 5.0
    ) -> List[Dict[str, any]]:
        """Detect momentum shifts when crossing threshold.
        
        Args:
            momentum: List of momentum values
            threshold: Threshold for shift detection
            
        Returns:
            List of shift events
        """
        shifts = []
        
        for i in range(1, len(momentum)):
            prev = momentum[i-1]
            curr = momentum[i]
            
            # Check for upward shift
            if prev < -threshold and curr > threshold:
                shifts.append({
                    "index": i,
                    "direction": "up",
                    "magnitude": round(curr - prev, 2),
                    "confidence": min(abs(curr - prev) / (2 * threshold), 1.0)
                })
            
            # Check for downward shift
            elif prev > threshold and curr < -threshold:
                shifts.append({
                    "index": i,
                    "direction": "down",
                    "magnitude": round(prev - curr, 2),
                    "confidence": min(abs(prev - curr) / (2 * threshold), 1.0)
                })
        
        return shifts
