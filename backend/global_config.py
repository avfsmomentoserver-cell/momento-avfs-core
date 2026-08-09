"""Global Configuration System for Cross-Branch Architecture.

This module provides configuration management for the global database and watcher,
as well as branch-specific configuration settings.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict

# Note: global_db import is deferred to avoid circular dependency
# Will be imported when needed


def _env_path(name: str, default: Path) -> Path:
    raw = os.environ.get(name)
    return Path(raw).expanduser().resolve() if raw else default


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


# ============================================================================
# GLOBAL CONFIGURATION
# ============================================================================

GLOBAL_DATA_DIR = _env_path("MOMENTO_GLOBAL_DATA_DIR", Path("/home/pirates/Avfs_Core/global_data"))
GLOBAL_WATCHER_ENABLED = _env_bool("MOMENTO_GLOBAL_WATCHER_ENABLED", True)
GLOBAL_WATCHER_INTERVAL = _env_int("MOMENTO_GLOBAL_WATCHER_INTERVAL", 2)
GLOBAL_DATABASE_PATH = GLOBAL_DATA_DIR / "momento_global.db"

# Global watch directories
GLOBAL_INBOX_DIR = GLOBAL_DATA_DIR / "inbox"
GLOBAL_PROCESSED_DIR = GLOBAL_DATA_DIR / "processed"
GLOBAL_FAILED_DIR = GLOBAL_DATA_DIR / "failed"


@dataclass
class GlobalWatcherConfig:
    """Configuration for the global watcher service."""
    
    enabled: bool = True
    interval_seconds: float = 2.0
    watch_directories: list = None
    auto_start: bool = True
    max_file_age_hours: int = 24
    max_retries: int = 3
    retry_delay_seconds: float = 5.0
    
    def __post_init__(self):
        if self.watch_directories is None:
            self.watch_directories = [str(GLOBAL_INBOX_DIR)]
    
    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class BranchConfig:
    """Configuration for branch-specific behavior."""
    
    branch_name: str
    enabled: bool = True
    analysis_settings: Dict[str, Any] = None
    feature_toggles: Dict[str, bool] = None
    api_config: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.analysis_settings is None:
            self.analysis_settings = {
                "session_gap_seconds": 300,
                "ladder_min_length": 3,
                "ladder_tolerance": 0.06,
                "compression_threshold": 75.0,
                "expansion_threshold": 60.0,
                "momentum_threshold": 60.0,
            }
        
        if self.feature_toggles is None:
            self.feature_toggles = {
                "state_engine": True,
                "dna_analysis": True,
                "transition_tracking": True,
                "composite_indices": True,
                "candlestick_grouping": True,
            }
        
        if self.api_config is None:
            self.api_config = {
                "prefix": f"/api/v1/{self.branch_name}",
                "enable_websocket": True,
                "cache_ttl_seconds": 5,
            }
    
    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    def merge(self, values: Dict[str, Any]) -> "BranchConfig":
        """Merge configuration values."""
        current = self.as_dict()
        
        for key, value in values.items():
            if key in current and value is not None:
                if isinstance(current[key], dict):
                    current[key].update(value)
                else:
                    current[key] = value
        
        return BranchConfig(**current)


# ============================================================================
# BRANCH CONFIGURATIONS
# ============================================================================

BRANCH_CONFIGS: Dict[str, BranchConfig] = {
    "main": BranchConfig(
        branch_name="main",
        enabled=True,
        analysis_settings={
            "session_gap_seconds": 300,
            "ladder_min_length": 3,
            "ladder_tolerance": 0.06,
            "low_band_threshold": 2.0,
            "ignition_threshold": 5.0,
            "moonshot_threshold": 10.0,
        },
        feature_toggles={
            "ladder_detection": True,
            "pressure_analysis": True,
            "moonshot_scanner": True,
            "dna_analysis": True,
            "state_engine": False,  # Main branch doesn't use FX state engine
        }
    ),
    
    "fx": BranchConfig(
        branch_name="fx",
        enabled=True,
        analysis_settings={
            "session_gap_seconds": 300,
            "compression_threshold": 75.0,
            "expansion_threshold": 60.0,
            "momentum_threshold": 60.0,
            "entropy_threshold": 50.0,
        },
        feature_toggles={
            "state_engine": True,  # FX branch uses state engine
            "dna_analysis": True,
            "transition_tracking": True,
            "composite_indices": True,
            "candlestick_grouping": True,
            "ladder_detection": False,  # FX branch uses different analysis
            "pressure_analysis": False,
        }
    ),
}


def get_branch_config(branch_name: str) -> BranchConfig:
    """Get configuration for a specific branch."""
    if branch_name not in BRANCH_CONFIGS:
        # Create default config for unknown branches
        return BranchConfig(branch_name=branch_name)
    
    return BRANCH_CONFIGS[branch_name]


def update_branch_config(branch_name: str, values: Dict[str, Any]) -> BranchConfig:
    """Update configuration for a specific branch."""
    current = get_branch_config(branch_name)
    updated = current.merge(values)
    BRANCH_CONFIGS[branch_name] = updated
    
    # Update in database (if global_db is available)
    try:
        from . import global_db as gdb
        metadata = gdb.get_branch_metadata(branch_name)
        config_json = json.dumps(updated.as_dict())
        
        with gdb.transaction() as conn:
            conn.execute("""
                UPDATE branch_metadata 
                SET config = ?, updated_at = ?
                WHERE branch_name = ?
            """, (config_json, gdb.utc_now(), branch_name))
    except Exception as e:
        print(f"Warning: Could not update branch config in database: {e}")
    
    return updated


def ensure_global_directories() -> None:
    """Create global data directory structure."""
    directories = [
        GLOBAL_DATA_DIR,
        GLOBAL_INBOX_DIR,
        GLOBAL_PROCESSED_DIR,
        GLOBAL_FAILED_DIR,
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)


def get_global_config() -> Dict[str, Any]:
    """Get global configuration summary."""
    return {
        "global_data_dir": str(GLOBAL_DATA_DIR),
        "watcher_enabled": GLOBAL_WATCHER_ENABLED,
        "watcher_interval": GLOBAL_WATCHER_INTERVAL,
        "database_path": str(GLOBAL_DATABASE_PATH),
        "branches": {name: config.as_dict() for name, config in BRANCH_CONFIGS.items()},
    }