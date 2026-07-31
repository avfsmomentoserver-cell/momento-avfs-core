"""Pattern learning for moonshot prediction using ML."""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("features.ai.pattern_learner")

# Try to import scikit-learn for ML capabilities
try:
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import classification_report, accuracy_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


class MoonshotPatternLearner:
    """Learn moonshot patterns from historical data using ML."""
    
    def __init__(self, use_ml: bool = True) -> None:
        self.patterns: List[Dict[str, Any]] = []
        self.feature_importance: Dict[str, float] = {}
        self.use_ml = use_ml and SKLEARN_AVAILABLE
        self.model = None
        self.feature_names: List[str] = []
    
    def extract_features(
        self,
        rounds: List[Dict[str, Any]],
        window: int = 20
    ) -> List[Dict[str, Any]]:
        """Extract features from pre-moonshot windows.
        
        Args:
            rounds: Historical rounds
            window: Window size before moonshot
            
        Returns:
            List of feature dictionaries
        """
        features = []
        
        # Find moonshot events
        moonshot_indices = [
            i for i, r in enumerate(rounds)
            if r["multiplier"] >= 10.0
        ]
        
        for idx in moonshot_indices:
            start = max(0, idx - window)
            pre_rounds = rounds[start:idx]
            
            if len(pre_rounds) < 5:  # Need at least 5 rounds
                continue
            
            feature = self._compute_window_features(pre_rounds)
            feature["target"] = 1  # Moonshot occurred
            features.append(feature)
        
        # Also extract non-moonshot windows for comparison
        non_moonshot_indices = [
            i for i, r in enumerate(rounds)
            if r["multiplier"] < 10.0
        ]
        
        for idx in non_moonshot_indices[:len(moonshot_indices)]:  # Balance classes
            start = max(0, idx - window)
            pre_rounds = rounds[start:idx]
            
            if len(pre_rounds) < 5:
                continue
            
            feature = self._compute_window_features(pre_rounds)
            feature["target"] = 0  # No moonshot
            features.append(feature)
        
        return features
    
    def _compute_window_features(self, rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compute features from a window of rounds.
        
        Args:
            rounds: Window of rounds
            
        Returns:
            Feature dictionary
        """
        multipliers = [r["multiplier"] for r in rounds]
        bands = [r.get("band", "low") for r in rounds]
        
        import statistics
        
        features = {
            "avg_multiplier": statistics.mean(multipliers),
            "std_multiplier": statistics.pstdev(multipliers) if len(multipliers) > 1 else 0.0,
            "min_multiplier": min(multipliers),
            "max_multiplier": max(multipliers),
            "trend": 1 if multipliers[-1] > multipliers[0] else 0,
            "band_changes": sum(1 for i in range(1, len(bands)) if bands[i] != bands[i-1]),
            "ignition_count": bands.count("ignition"),
            "moonshot_count": bands.count("moonshot"),
            "low_count": bands.count("low")
        }
        
        return features
    
    def learn_patterns(
        self,
        features: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Learn moonshot patterns from extracted features.
        
        Uses scikit-learn if available, otherwise falls back to rule-based approach.
        
        Args:
            features: Extracted feature list
            
        Returns:
            Pattern learning results
        """
        if not features:
            return {
                "patterns": [],
                "feature_importance": {},
                "accuracy": 0.0,
                "method": "none"
            }
        
        # Separate features and targets
        X = []
        y = []
        
        feature_names = list(features[0].keys())
        if "target" in feature_names:
            feature_names.remove("target")
        
        self.feature_names = feature_names
        
        for f in features:
            X.append([f[name] for name in feature_names])
            y.append(f["target"])
        
        # Use ML if available and enabled
        if self.use_ml:
            return self._learn_with_ml(X, y, features, feature_names)
        else:
            # Fallback to simple rule-based pattern learning
            patterns = self._extract_simple_patterns(features, feature_names)
            feature_importance = self._calculate_feature_importance(features, feature_names)
            accuracy = self._calculate_accuracy(features, patterns)
            
            return {
                "patterns": patterns,
                "feature_importance": feature_importance,
                "accuracy": round(accuracy, 4),
                "feature_names": feature_names,
                "method": "rule_based"
            }
    
    def _learn_with_ml(
        self,
        X: List[List[float]],
        y: List[int],
        features: List[Dict[str, Any]],
        feature_names: List[str]
    ) -> Dict[str, Any]:
        """Learn patterns using scikit-learn.
        
        Args:
            X: Feature matrix
            y: Target labels
            features: Original feature dictionaries
            feature_names: Feature name list
            
        Returns:
            Pattern learning results
        """
        try:
            # Split data for validation
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Train Random Forest classifier
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                class_weight='balanced'
            )
            self.model.fit(X_train, y_train)
            
            # Calculate accuracy
            y_pred = self.model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            # Get feature importance
            feature_importance = dict(zip(feature_names, self.model.feature_importances_.tolist()))
            
            # Generate pattern rules from feature importance
            patterns = self._generate_patterns_from_model(features, feature_names, feature_importance)
            
            # Cross-validation score
            cv_scores = cross_val_score(self.model, X, y, cv=5)
            
            return {
                "patterns": patterns,
                "feature_importance": {k: round(v, 4) for k, v in feature_importance.items()},
                "accuracy": round(accuracy, 4),
                "cv_mean": round(cv_scores.mean(), 4),
                "cv_std": round(cv_scores.std(), 4),
                "feature_names": feature_names,
                "method": "random_forest"
            }
            
        except Exception as e:
            logger.error(f"ML learning failed: {e}")
            # Fallback to rule-based
            patterns = self._extract_simple_patterns(features, feature_names)
            feature_importance = self._calculate_feature_importance(features, feature_names)
            accuracy = self._calculate_accuracy(features, patterns)
            
            return {
                "patterns": patterns,
                "feature_importance": feature_importance,
                "accuracy": round(accuracy, 4),
                "feature_names": feature_names,
                "method": "rule_based_fallback",
                "error": str(e)
            }
    
    def _generate_patterns_from_model(
        self,
        features: List[Dict[str, Any]],
        feature_names: List[str],
        feature_importance: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Generate pattern rules from trained model.
        
        Args:
            features: Feature dictionaries
            feature_names: Feature name list
            feature_importance: Feature importance from model
            
        Returns:
            List of pattern rules
        """
        patterns = []
        
        # Separate by target
        moonshot_features = [f for f in features if f["target"] == 1]
        non_moonshot_features = [f for f in features if f["target"] == 0]
        
        if not moonshot_features or not non_moonshot_features:
            return patterns
        
        # Generate patterns for top important features
        sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
        top_features = sorted_features[:5]  # Top 5 features
        
        for feature_name, importance in top_features:
            moonshot_values = [f[feature_name] for f in moonshot_features]
            non_moonshot_values = [f[feature_name] for f in non_moonshot_features]
            
            import statistics
            moonshot_avg = statistics.mean(moonshot_values)
            non_moonshot_avg = statistics.mean(non_moonshot_values)
            
            patterns.append({
                "feature": feature_name,
                "importance": round(importance, 4),
                "moonshot_avg": round(moonshot_avg, 4),
                "non_moonshot_avg": round(non_moonshot_avg, 4),
                "direction": "higher" if moonshot_avg > non_moonshot_avg else "lower"
            })
        
        return patterns
    
    def _extract_simple_patterns(
        self,
        features: List[Dict[str, Any]],
        feature_names: List[str]
    ) -> List[Dict[str, Any]]:
        """Extract simple patterns from features.
        
        Args:
            features: Feature list
            feature_names: Feature name list
            
        Returns:
            List of pattern rules
        """
        patterns = []
        
        # Separate moonshot and non-moonshot features
        moonshot_features = [f for f in features if f["target"] == 1]
        non_moonshot_features = [f for f in features if f["target"] == 0]
        
        if not moonshot_features or not non_moonshot_features:
            return patterns
        
        # Find distinguishing features
        for name in feature_names:
            moonshot_values = [f[name] for f in moonshot_features]
            non_moonshot_values = [f[name] for f in non_moonshot_features]
            
            import statistics
            moonshot_avg = statistics.mean(moonshot_values)
            non_moonshot_avg = statistics.mean(non_moonshot_values)
            
            # If there's a significant difference
            if abs(moonshot_avg - non_moonshot_avg) > 0.1 * abs(non_moonshot_avg):
                patterns.append({
                    "feature": name,
                    "moonshot_avg": round(moonshot_avg, 4),
                    "non_moonshot_avg": round(non_moonshot_avg, 4),
                    "direction": "higher" if moonshot_avg > non_moonshot_avg else "lower"
                })
        
        return patterns
    
    def _calculate_feature_importance(
        self,
        features: List[Dict[str, Any]],
        feature_names: List[str]
    ) -> Dict[str, float]:
        """Calculate feature importance using correlation.
        
        Args:
            features: Feature list
            feature_names: Feature name list
            
        Returns:
            Feature importance dictionary
        """
        importance = {}
        
        for name in feature_names:
            values = [f[name] for f in features]
            targets = [f["target"] for f in features]
            
            # Calculate correlation
            correlation = self._calculate_correlation(values, targets)
            importance[name] = round(abs(correlation), 4)
        
        return importance
    
    def _calculate_correlation(self, x: List[float], y: List[int]) -> float:
        """Calculate correlation between two lists.
        
        Args:
            x: First list
            y: Second list
            
        Returns:
            Correlation coefficient
        """
        import statistics
        
        if len(x) != len(y) or len(x) < 2:
            return 0.0
        
        mean_x = statistics.mean(x)
        mean_y = statistics.mean(y)
        
        numerator = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
        denominator_x = sum((xi - mean_x) ** 2 for xi in x) ** 0.5
        denominator_y = sum((yi - mean_y) ** 2 for yi in y) ** 0.5
        
        if denominator_x == 0 or denominator_y == 0:
            return 0.0
        
        return numerator / (denominator_x * denominator_y)
    
    def _calculate_accuracy(
        self,
        features: List[Dict[str, Any]],
        patterns: List[Dict[str, Any]]
    ) -> float:
        """Calculate accuracy of patterns on training data.
        
        Args:
            features: Feature list
            patterns: Learned patterns
            
        Returns:
            Accuracy score
        """
        if not patterns:
            return 0.0
        
        correct = 0
        
        for f in features:
            # Simple prediction based on patterns
            score = 0
            for pattern in patterns:
                feature_name = pattern["feature"]
                value = f[feature_name]
                moonshot_avg = pattern["moonshot_avg"]
                
                if pattern["direction"] == "higher" and value > moonshot_avg:
                    score += 1
                elif pattern["direction"] == "lower" and value < moonshot_avg:
                    score += 1
            
            predicted = 1 if score > len(patterns) / 2 else 0
            if predicted == f["target"]:
                correct += 1
        
        return correct / len(features) if features else 0.0
    
    def predict_moonshot(
        self,
        current_features: Dict[str, Any],
        patterns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Predict moonshot probability using learned patterns.
        
        Args:
            current_features: Current feature values
            patterns: Learned patterns
            
        Returns:
            Prediction dictionary
        """
        if not patterns:
            return {"probability": 0.0, "confidence": 0.0}
        
        # Use ML model if available
        if self.use_ml and self.model is not None:
            return self._predict_with_ml(current_features)
        
        # Fallback to rule-based prediction
        score = 0
        for pattern in patterns:
            feature_name = pattern["feature"]
            value = current_features.get(feature_name, 0)
            moonshot_avg = pattern["moonshot_avg"]
            
            if pattern["direction"] == "higher" and value > moonshot_avg:
                score += 1
            elif pattern["direction"] == "lower" and value < moonshot_avg:
                score += 1
        
        probability = score / len(patterns)
        confidence = min(len(patterns) / 5.0, 1.0)  # More patterns = higher confidence
        
        return {
            "probability": round(probability, 4),
            "confidence": round(confidence, 4),
            "method": "rule_based"
        }
    
    def _predict_with_ml(self, current_features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict using trained ML model.
        
        Args:
            current_features: Current feature values
            
        Returns:
            Prediction dictionary
        """
        try:
            # Prepare feature vector
            feature_vector = [current_features.get(name, 0) for name in self.feature_names]
            
            # Get probability prediction
            probability = self.model.predict_proba([feature_vector])[0][1]
            
            return {
                "probability": round(probability, 4),
                "confidence": 0.8,  # ML models generally have higher confidence
                "method": "random_forest"
            }
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")
            return {"probability": 0.0, "confidence": 0.0, "method": "error", "error": str(e)}
