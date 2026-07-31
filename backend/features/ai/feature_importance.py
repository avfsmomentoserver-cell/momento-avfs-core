"""Feature importance analysis with SHAP values."""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("features.ai.feature_importance")

# Try to import SHAP for feature importance analysis
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False


class FeatureImportanceAnalyzer:
    """Analyze feature importance using SHAP values."""
    
    def __init__(self) -> None:
        self.shap_values = None
        self.feature_names = []
        self.importance_history: List[Dict[str, Any]] = []
    
    def compute_shap_values(
        self,
        model,
        X: List[List[float]],
        feature_names: List[str]
    ) -> Dict[str, Any]:
        """Compute SHAP values for feature importance analysis.
        
        Args:
            model: Trained ML model
            X: Feature matrix
            feature_names: Feature name list
            
        Returns:
            Dictionary with SHAP analysis results
        """
        if not SHAP_AVAILABLE:
            return {
                "error": "SHAP not available",
                "method": "none"
            }
        
        try:
            import numpy as np
            
            # Convert to numpy array
            X_array = np.array(X)
            
            # Create SHAP explainer
            explainer = shap.TreeExplainer(model)
            
            # Compute SHAP values
            shap_values = explainer.shap_values(X_array)
            
            # Store for later use
            self.shap_values = shap_values
            self.feature_names = feature_names
            
            # Calculate mean absolute SHAP values for feature importance
            if isinstance(shap_values, list):
                # For classification, shap_values is a list (one per class)
                shap_values_array = np.abs(shap_values[1]).mean(axis=0)  # Use positive class
            else:
                shap_values_array = np.abs(shap_values).mean(axis=0)
            
            feature_importance = dict(zip(feature_names, shap_values_array.tolist()))
            
            # Normalize to percentages
            total = sum(feature_importance.values())
            if total > 0:
                feature_importance = {k: round(v / total * 100, 2) for k, v in feature_importance.items()}
            
            # Store in history
            self.importance_history.append({
                "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
                "importance": feature_importance.copy(),
                "method": "shap"
            })
            
            return {
                "feature_importance": feature_importance,
                "shap_values": shap_values.tolist() if hasattr(shap_values, 'tolist') else str(shap_values),
                "method": "shap",
                "feature_names": feature_names
            }
            
        except Exception as e:
            logger.error(f"SHAP computation failed: {e}")
            return {
                "error": str(e),
                "method": "shap_failed"
            }
    
    def get_feature_importance_summary(self) -> Dict[str, Any]:
        """Get summary of feature importance over time.
        
        Returns:
            Dictionary with importance summary
        """
        if not self.importance_history:
            return {"error": "No importance history available"}
        
        # Calculate average importance over time
        avg_importance = {}
        for entry in self.importance_history:
            for feature, importance in entry["importance"].items():
                if feature not in avg_importance:
                    avg_importance[feature] = []
                avg_importance[feature].append(importance)
        
        avg_importance = {
            k: round(sum(v) / len(v), 2)
            for k, v in avg_importance.items()
        }
        
        # Get trend (increasing or decreasing)
        if len(self.importance_history) >= 2:
            latest = self.importance_history[-1]["importance"]
            previous = self.importance_history[-2]["importance"]
            
            trends = {}
            for feature in avg_importance.keys():
                latest_val = latest.get(feature, 0)
                previous_val = previous.get(feature, 0)
                if latest_val > previous_val:
                    trends[feature] = "increasing"
                elif latest_val < previous_val:
                    trends[feature] = "decreasing"
                else:
                    trends[feature] = "stable"
        else:
            trends = {}
        
        return {
            "average_importance": avg_importance,
            "trends": trends,
            "history_count": len(self.importance_history),
            "latest_method": self.importance_history[-1].get("method", "unknown")
        }
    
    def get_top_features(self, n: int = 5) -> List[Dict[str, Any]]:
        """Get top N most important features.
        
        Args:
            n: Number of top features to return
            
        Returns:
            List of top features with importance
        """
        if not self.importance_history:
            return []
        
        latest_importance = self.importance_history[-1]["importance"]
        
        sorted_features = sorted(
            latest_importance.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {"feature": k, "importance": v}
            for k, v in sorted_features[:n]
        ]
    
    def get_underperforming_features(self, threshold: float = 5.0) -> List[str]:
        """Get features with importance below threshold.
        
        Args:
            threshold: Importance threshold percentage
            
        Returns:
            List of underperforming feature names
        """
        if not self.importance_history:
            return []
        
        latest_importance = self.importance_history[-1]["importance"]
        
        return [
            feature
            for feature, importance in latest_importance.items()
            if importance < threshold
        ]
    
    def clear_history(self) -> None:
        """Clear importance history."""
        self.importance_history = []
        self.shap_values = None
        self.feature_names = []


# Global analyzer instance
importance_analyzer = FeatureImportanceAnalyzer()
