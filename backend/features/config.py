"""Feature configuration for all analysis features."""

from typing import Any, Dict


class FeatureConfig:
    """Configuration for analysis features."""
    
    def __init__(self) -> None:
        # Pressure plugin settings
        self.pressure_min_touches = 3
        self.pressure_tolerance = 0.05
        self.pressure_history_window = 20
        self.pressure_threshold_critical = 90.0
        self.pressure_threshold_high = 70.0
        self.pressure_threshold_moderate = 50.0
        
        # Equal baseline settings
        self.baseline_min_multiplier = 1.0
        self.baseline_max_multiplier = 50.0
        self.trendline_window = 20
        self.momentum_shift_threshold = 5.0
        
        # Moonshot scanner settings
        self.moonshot_lookback = 100
        self.moonshot_threshold = 10.0
        self.moonshot_confidence_threshold = 0.7
        self.moonshot_distance_targets = [10.0, 20.0, 50.0]
        
        # Band analysis settings
        self.ladder_min_length = 3
        self.ladder_bands = [
            ("ignition", (2.0, 3.0)),
            ("transition", (3.0, 5.0)),
            ("moonshot_approach", (5.0, 10.0)),
            ("mega_approach", (10.0, 50.0)),
            ("extreme", (50.0, 100.0))
        ]
        
        # Backtest settings
        self.backtest_warmup_pct = 0.1
        self.backtest_stress_pct = 0.3
        self.backtest_min_session_rounds = 10
        self.backtest_default_gap = 300
        self.backtest_default_window = 5000
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return {
            "pressure_min_touches": self.pressure_min_touches,
            "pressure_tolerance": self.pressure_tolerance,
            "pressure_history_window": self.pressure_history_window,
            "pressure_threshold_critical": self.pressure_threshold_critical,
            "pressure_threshold_high": self.pressure_threshold_high,
            "pressure_threshold_moderate": self.pressure_threshold_moderate,
            "baseline_min_multiplier": self.baseline_min_multiplier,
            "baseline_max_multiplier": self.baseline_max_multiplier,
            "trendline_window": self.trendline_window,
            "momentum_shift_threshold": self.momentum_shift_threshold,
            "moonshot_lookback": self.moonshot_lookback,
            "moonshot_threshold": self.moonshot_threshold,
            "moonshot_confidence_threshold": self.moonshot_confidence_threshold,
            "moonshot_distance_targets": self.moonshot_distance_targets,
            "ladder_min_length": self.ladder_min_length,
            "ladder_bands": self.ladder_bands,
            "backtest_warmup_pct": self.backtest_warmup_pct,
            "backtest_stress_pct": self.backtest_stress_pct,
            "backtest_min_session_rounds": self.backtest_min_session_rounds,
            "backtest_default_gap": self.backtest_default_gap,
            "backtest_default_window": self.backtest_default_window
        }
    
    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "FeatureConfig":
        """Create configuration from dictionary."""
        config = cls()
        
        config.pressure_min_touches = config_dict.get("pressure_min_touches", 3)
        config.pressure_tolerance = config_dict.get("pressure_tolerance", 0.05)
        config.pressure_history_window = config_dict.get("pressure_history_window", 20)
        config.pressure_threshold_critical = config_dict.get("pressure_threshold_critical", 90.0)
        config.pressure_threshold_high = config_dict.get("pressure_threshold_high", 70.0)
        config.pressure_threshold_moderate = config_dict.get("pressure_threshold_moderate", 50.0)
        config.baseline_min_multiplier = config_dict.get("baseline_min_multiplier", 1.0)
        config.baseline_max_multiplier = config_dict.get("baseline_max_multiplier", 50.0)
        config.trendline_window = config_dict.get("trendline_window", 20)
        config.momentum_shift_threshold = config_dict.get("momentum_shift_threshold", 5.0)
        config.moonshot_lookback = config_dict.get("moonshot_lookback", 100)
        config.moonshot_threshold = config_dict.get("moonshot_threshold", 10.0)
        config.moonshot_confidence_threshold = config_dict.get("moonshot_confidence_threshold", 0.7)
        config.moonshot_distance_targets = config_dict.get("moonshot_distance_targets", [10.0, 20.0, 50.0])
        config.ladder_min_length = config_dict.get("ladder_min_length", 3)
        config.ladder_bands = config_dict.get("ladder_bands", config.ladder_bands)
        config.backtest_warmup_pct = config_dict.get("backtest_warmup_pct", 0.1)
        config.backtest_stress_pct = config_dict.get("backtest_stress_pct", 0.3)
        config.backtest_min_session_rounds = config_dict.get("backtest_min_session_rounds", 10)
        config.backtest_default_gap = config_dict.get("backtest_default_gap", 300)
        config.backtest_default_window = config_dict.get("backtest_default_window", 5000)
        
        return config


# Default configuration instance
default_config = FeatureConfig()
