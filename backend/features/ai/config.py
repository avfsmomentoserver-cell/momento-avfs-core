"""AI configuration for optimization and pattern learning."""

from typing import Any, Dict, List, Optional


class AIConfig:
    """Configuration for AI components."""
    
    def __init__(self) -> None:
        # Backtest optimizer settings
        self.optimizer_min_samples = 3
        self.optimizer_confidence_threshold = 0.5
        self.optimizer_max_runtime = 600  # seconds
        
        # Pattern learner settings
        self.learner_window_size = 20
        self.learner_min_samples = 10
        self.learner_balance_classes = True
        self.learner_feature_threshold = 0.1
        
        # ML settings (for future scikit-learn integration)
        self.ml_enabled = False
        self.ml_framework = "sklearn"  # or "xgboost", "tensorflow"
        self.ml_random_state = 42
        self.ml_test_size = 0.2
        self.ml_cross_validation_folds = 5
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return {
            "optimizer_min_samples": self.optimizer_min_samples,
            "optimizer_confidence_threshold": self.optimizer_confidence_threshold,
            "optimizer_max_runtime": self.optimizer_max_runtime,
            "learner_window_size": self.learner_window_size,
            "learner_min_samples": self.learner_min_samples,
            "learner_balance_classes": self.learner_balance_classes,
            "learner_feature_threshold": self.learner_feature_threshold,
            "ml_enabled": self.ml_enabled,
            "ml_framework": self.ml_framework,
            "ml_random_state": self.ml_random_state,
            "ml_test_size": self.ml_test_size,
            "ml_cross_validation_folds": self.ml_cross_validation_folds
        }
    
    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "AIConfig":
        """Create configuration from dictionary."""
        config = cls()
        
        config.optimizer_min_samples = config_dict.get("optimizer_min_samples", 3)
        config.optimizer_confidence_threshold = config_dict.get("optimizer_confidence_threshold", 0.5)
        config.optimizer_max_runtime = config_dict.get("optimizer_max_runtime", 600)
        config.learner_window_size = config_dict.get("learner_window_size", 20)
        config.learner_min_samples = config_dict.get("learner_min_samples", 10)
        config.learner_balance_classes = config_dict.get("learner_balance_classes", True)
        config.learner_feature_threshold = config_dict.get("learner_feature_threshold", 0.1)
        config.ml_enabled = config_dict.get("ml_enabled", False)
        config.ml_framework = config_dict.get("ml_framework", "sklearn")
        config.ml_random_state = config_dict.get("ml_random_state", 42)
        config.ml_test_size = config_dict.get("ml_test_size", 0.2)
        config.ml_cross_validation_folds = config_dict.get("ml_cross_validation_folds", 5)
        
        return config


# Default configuration instance
default_config = AIConfig()
