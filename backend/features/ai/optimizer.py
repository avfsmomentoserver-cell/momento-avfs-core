"""AI-assisted backtest configuration optimizer.

This module uses historical backtest results to suggest optimal
configurations for future backtests.
"""

import logging
import statistics
from typing import Any, Dict, List, Optional

logger = logging.getLogger("momento.ai.optimizer")


class BacktestOptimizer:
    """Optimize backtest configurations using historical data."""
    
    def __init__(self) -> None:
        self.historical_results: List[Dict[str, Any]] = []
    
    def add_result(self, result: Dict[str, Any]) -> None:
        """Add a historical backtest result.
        
        Args:
            result: Backtest result dictionary
        """
        self.historical_results.append(result)
    
    def suggest_session_gap(self, source: str = "aviator") -> Dict[str, Any]:
        """Suggest optimal session gap threshold.
        
        Analyzes historical results to find the gap that produced
        the highest accuracy.
        
        Args:
            source: Data source
            
        Returns:
            Dictionary with suggested gap and confidence
        """
        if not self.historical_results:
            return {"suggested_gap": 300, "confidence": 0.0, "reason": "No historical data"}
        
        # Extract session gaps and accuracies
        gap_accuracies = []
        for result in self.historical_results:
            config = result.get("config", {})
            gap = config.get("session_gap", 300)
            accuracy = result.get("baseline_accuracy", 0.0)
            gap_accuracies.append((gap, accuracy))
        
        if not gap_accuracies:
            return {"suggested_gap": 300, "confidence": 0.0, "reason": "No valid data"}
        
        # Group by gap and compute average accuracy
        gap_groups: Dict[int, List[float]] = {}
        for gap, acc in gap_accuracies:
            if gap not in gap_groups:
                gap_groups[gap] = []
            gap_groups[gap].append(acc)
        
        # Find best gap
        best_gap = 300
        best_avg_acc = 0.0
        
        for gap, accuracies in gap_groups.items():
            avg_acc = statistics.mean(accuracies)
            if avg_acc > best_avg_acc:
                best_avg_acc = avg_acc
                best_gap = gap
        
        # Calculate confidence based on sample size
        sample_size = len(gap_groups.get(best_gap, []))
        confidence = min(sample_size / 10.0, 1.0)  # Max confidence at 10 samples
        
        return {
            "suggested_gap": best_gap,
            "confidence": round(confidence, 2),
            "average_accuracy": round(best_avg_acc, 4),
            "sample_size": sample_size,
            "reason": f"Based on {sample_size} historical runs"
        }
    
    def suggest_window_size(self, source: str = "aviator") -> Dict[str, Any]:
        """Suggest optimal window size for analysis.
        
        Args:
            source: Data source
            
        Returns:
            Dictionary with suggested window size and confidence
        """
        if not self.historical_results:
            return {"suggested_window": 5000, "confidence": 0.0, "reason": "No historical data"}
        
        # Extract window sizes and accuracies
        window_accuracies = []
        for result in self.historical_results:
            config = result.get("config", {})
            window = config.get("window_size", 5000)
            accuracy = result.get("baseline_accuracy", 0.0)
            window_accuracies.append((window, accuracy))
        
        if not window_accuracies:
            return {"suggested_window": 5000, "confidence": 0.0, "reason": "No valid data"}
        
        # Group by window and compute average accuracy
        window_groups: Dict[int, List[float]] = {}
        for window, acc in window_accuracies:
            if window not in window_groups:
                window_groups[window] = []
            window_groups[window].append(acc)
        
        # Find best window
        best_window = 5000
        best_avg_acc = 0.0
        
        for window, accuracies in window_groups.items():
            avg_acc = statistics.mean(accuracies)
            if avg_acc > best_avg_acc:
                best_avg_acc = avg_acc
                best_window = window
        
        # Calculate confidence
        sample_size = len(window_groups.get(best_window, []))
        confidence = min(sample_size / 10.0, 1.0)
        
        return {
            "suggested_window": best_window,
            "confidence": round(confidence, 2),
            "average_accuracy": round(best_avg_acc, 4),
            "sample_size": sample_size,
            "reason": f"Based on {sample_size} historical runs"
        }
    
    def suggest_feature_toggles(
        self,
        source: str = "aviator",
        objective: str = "maximize_accuracy"
    ) -> Dict[str, Any]:
        """Suggest optimal feature toggle configuration.
        
        Args:
            source: Data source
            objective: Optimization objective
            
        Returns:
            Dictionary with suggested toggles and confidence
        """
        if not self.historical_results:
            return {
                "suggested_toggles": {},
                "confidence": 0.0,
                "reason": "No historical data"
            }
        
        # Extract feature toggles and accuracies
        toggle_accuracies = []
        for result in self.historical_results:
            config = result.get("config", {})
            toggles = config.get("feature_toggles", {})
            accuracy = result.get("baseline_accuracy", 0.0)
            
            # Convert toggles to hashable key
            toggle_key = tuple(sorted(toggles.items()))
            toggle_accuracies.append((toggle_key, accuracy))
        
        if not toggle_accuracies:
            return {
                "suggested_toggles": {},
                "confidence": 0.0,
                "reason": "No valid data"
            }
        
        # Group by toggle configuration
        toggle_groups: Dict[tuple, List[float]] = {}
        for toggle_key, acc in toggle_accuracies:
            if toggle_key not in toggle_groups:
                toggle_groups[toggle_key] = []
            toggle_groups[toggle_key].append(acc)
        
        # Find best toggle configuration
        best_toggles = {}
        best_avg_acc = 0.0
        
        for toggle_key, accuracies in toggle_groups.items():
            avg_acc = statistics.mean(accuracies)
            if avg_acc > best_avg_acc:
                best_avg_acc = avg_acc
                best_toggles = dict(toggle_key)
        
        # Calculate confidence
        sample_size = len(toggle_groups.get(tuple(sorted(best_toggles.items())), []))
        confidence = min(sample_size / 10.0, 1.0)
        
        return {
            "suggested_toggles": best_toggles,
            "confidence": round(confidence, 2),
            "average_accuracy": round(best_avg_acc, 4),
            "sample_size": sample_size,
            "reason": f"Based on {sample_size} historical runs"
        }
    
    def suggest_backtest_config(
        self,
        historical_results: List[Dict[str, Any]],
        objective: str = "maximize_accuracy",
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Suggest complete backtest configuration.
        
        Args:
            historical_results: List of historical backtest results
            objective: Optimization objective
            constraints: Optional constraints (e.g., max_runtime)
            
        Returns:
            Dictionary with suggested configuration
        """
        # Load historical results
        self.historical_results = historical_results
        
        # Get individual suggestions
        gap_suggestion = self.suggest_session_gap()
        window_suggestion = self.suggest_window_size()
        toggles_suggestion = self.suggest_feature_toggles()
        
        # Build complete configuration
        config = {
            "session_gap": gap_suggestion["suggested_gap"],
            "window_size": window_suggestion["suggested_window"],
            "feature_toggles": toggles_suggestion["suggested_toggles"],
            "confidence": statistics.mean([
                gap_suggestion["confidence"],
                window_suggestion["confidence"],
                toggles_suggestion["confidence"]
            ])
        }
        
        # Apply constraints if provided
        if constraints:
            if "max_runtime" in constraints:
                # Adjust window size based on runtime constraint
                # This is a simple heuristic - can be enhanced with actual runtime data
                max_window = int(constraints["max_runtime"] / 0.1)  # Assume 0.1s per round
                config["window_size"] = min(config["window_size"], max_window)
        
        return config
