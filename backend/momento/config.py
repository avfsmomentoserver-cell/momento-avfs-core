"""Runtime configuration for Momento Core.

All values are overridable through environment variables so that local,
staging and production deployments never require code edits.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict


def _root() -> Path:
    """Resolve the backend root directory (the folder containing `momento/`)."""
    return Path(__file__).resolve().parent.parent


def _env_path(name: str, default: Path) -> Path:
    raw = os.environ.get(name)
    return Path(raw).expanduser().resolve() if raw else default


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


ROOT = _root()

DATA_DIR = _env_path("MOMENTO_DATA_DIR", ROOT / "data")
DATABASE_PATH = _env_path("MOMENTO_DATABASE_PATH", DATA_DIR / "momento.db")
INBOX_DIR = _env_path("MOMENTO_INBOX_DIR", DATA_DIR / "inbox")
PROCESSED_DIR = _env_path("MOMENTO_PROCESSED_DIR", DATA_DIR / "processed")
FAILED_DIR = _env_path("MOMENTO_FAILED_DIR", DATA_DIR / "failed")
DOWNLOADS_DIR = _env_path("MOMENTO_DOWNLOADS_DIR", Path.home() / "Downloads")
LOG_DIR = _env_path("MOMENTO_LOG_DIR", ROOT / "logs")

# Static artefacts served to the dashboards (step docs + source bundles).
DIST_DIR = _env_path("MOMENTO_DIST_DIR", ROOT.parent / "downloads")
DOCS_DIR = _env_path("MOMENTO_DOCS_DIR", ROOT.parent / "docs")

API_HOST = os.environ.get("MOMENTO_API_HOST", "0.0.0.0")
API_PORT = _env_int("MOMENTO_API_PORT", 8000)

SECRET_KEY = os.environ.get("MOMENTO_SECRET_KEY", "momento-core-local-development-key")
TOKEN_TTL_SECONDS = _env_int("MOMENTO_TOKEN_TTL", 60 * 60 * 12)

# Operator bootstrap account, created on first boot if the table is empty.
BOOTSTRAP_OPERATOR_EMAIL = os.environ.get("MOMENTO_OPERATOR_EMAIL", "operator@momento.local")
BOOTSTRAP_OPERATOR_PASSWORD = os.environ.get("MOMENTO_OPERATOR_PASSWORD", "momento")

WATCHER_ENABLED = _env_bool("MOMENTO_WATCHER_ENABLED", True)
WATCHER_INTERVAL = _env_float("MOMENTO_WATCHER_INTERVAL", 2.0)
WATCH_DOWNLOADS = _env_bool("MOMENTO_WATCH_DOWNLOADS", False)

FEED_ENABLED_ON_BOOT = _env_bool("MOMENTO_FEED_AUTOSTART", True)

CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "MOMENTO_CORS_ORIGINS",
        "http://localhost:5173,http://localhost:4173,http://localhost:3000,http://127.0.0.1:5173,"
        "http://localhost:8080,http://127.0.0.1:8080,http://10.0.0.4:8080,http://10.8.0.1:8080,"
        "http://10.0.0.4:5173,http://10.8.0.1:5173",
    ).split(",")
    if o.strip()
]
ALLOW_ALL_CORS = _env_bool("MOMENTO_CORS_ALLOW_ALL", True)


@dataclass
class AnalysisSettings:
    """Tunable analysis parameters, persisted in the settings table."""

    session_gap_seconds: int = 300  # 5 minutes - continuous rounds with <5min gap stay in same session
    mega_session_gap_seconds: int = 172800  # 48 hours for mega pressure tracker
    ladder_min_length: int = 3
    ladder_tolerance: float = 0.06
    collapse_min_length: int = 3
    low_band_threshold: float = 2.0
    ignition_threshold: float = 5.0
    moonshot_threshold: float = 10.0
    mega_moonshot_threshold: float = 50.0
    shelf_window: int = 12
    shelf_variance: float = 0.35
    bait_spike_ratio: float = 2.2
    resistance_bins: int = 24
    forecast_horizon: int = 5
    volatility_window: int = 30
    dna_window: int = 8
    dna_tolerance: float = 0.85
    house_edge_prior: float = 0.03
    confidence_floor: float = 0.05
    max_rounds_buffer: int = 5000

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def merge(self, values: Dict[str, Any]) -> "AnalysisSettings":
        """Return a copy with validated overrides applied."""
        data = self.as_dict()
        for key, value in values.items():
            if key not in data or value is None:
                continue
            current = data[key]
            try:
                data[key] = int(value) if isinstance(current, int) else float(value)
            except (TypeError, ValueError):
                continue
        return AnalysisSettings(**data)


@dataclass
class RuntimeToggles:
    """Feature switches the operator can flip live from Master Settings."""

    engines_enabled: bool = True
    signal_engine: bool = True
    market_engine: bool = True
    forecast_engine: bool = True
    linguistics_engine: bool = True
    ceiling_analyzer: bool = True
    gap_swing_analyzer: bool = True
    ml_predictions: bool = True
    autopilot_engine: bool = True
    broadcast_enabled: bool = True
    
    # Advanced moonshot signals
    moonshot_eta: bool = True
    exhaustion_calculator: bool = True
    sweet_spot_signal: bool = True
    chase_readiness: bool = True
    pressure_exhaustion: bool = True
    compression_exhaustion: bool = True
    ceiling_exhaustion: bool = True

    def as_dict(self) -> Dict[str, bool]:
        return asdict(self)

    def merge(self, values: Dict[str, Any]) -> "RuntimeToggles":
        data = self.as_dict()
        for key, value in values.items():
            if key in data and value is not None:
                data[key] = bool(value)
        return RuntimeToggles(**data)


@dataclass
class BacktestingSettings:
    """Backtesting configuration parameters for the Investigation Suite."""

    default_session_gap: int = 300
    default_window_size: int = 600
    min_session_rounds: int = 10
    accuracy_threshold: float = 0.5
    confidence_threshold: float = 0.7
    max_backtest_rounds: int = 10000
    enable_parallel: bool = True
    parallel_workers: int = 4

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def merge(self, values: Dict[str, Any]) -> "BacktestingSettings":
        data = self.as_dict()
        for key, value in values.items():
            if key not in data or value is None:
                continue
            current = data[key]
            try:
                if isinstance(current, bool):
                    data[key] = bool(value)
                else:
                    data[key] = int(value) if isinstance(current, int) else float(value)
            except (TypeError, ValueError):
                continue
        return BacktestingSettings(**data)


@dataclass
class DashboardSettings:
    """Dashboard UI/UX configuration."""

    default_rounds_limit: int = 400
    refresh_interval_rounds: int = 2000
    refresh_interval_analysis: int = 5000
    refresh_interval_slow: int = 30000
    enable_animations: bool = True
    compact_mode: bool = False
    show_timestamps: bool = True
    show_bands: bool = True
    show_points: bool = True

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def merge(self, values: Dict[str, Any]) -> "DashboardSettings":
        data = self.as_dict()
        for key, value in values.items():
            if key not in data or value is None:
                continue
            current = data[key]
            try:
                if isinstance(current, bool):
                    data[key] = bool(value)
                else:
                    data[key] = int(value) if isinstance(current, int) else float(value)
            except (TypeError, ValueError):
                continue
        return DashboardSettings(**data)


DEFAULT_SOURCES: list[dict[str, Any]] = [
    {"id": "aviator", "name": "Aviator", "icon": "plane", "active": True},
    {"id": "jetx", "name": "JetX", "icon": "rocket", "active": True},
    {"id": "crash", "name": "Crash", "icon": "zap", "active": True},
    {"id": "spaceman", "name": "Spaceman", "icon": "orbit", "active": False},
]


def ensure_directories() -> None:
    """Create every directory the platform writes to."""
    for directory in (
        DATA_DIR,
        DATABASE_PATH.parent,
        INBOX_DIR,
        PROCESSED_DIR,
        FAILED_DIR,
        LOG_DIR,
        DIST_DIR,
    ):
        directory.mkdir(parents=True, exist_ok=True)


def describe() -> Dict[str, Any]:
    """Human readable configuration snapshot for the /health endpoint."""
    return {
        "database_path": str(DATABASE_PATH),
        "inbox_dir": str(INBOX_DIR),
        "processed_dir": str(PROCESSED_DIR),
        "failed_dir": str(FAILED_DIR),
        "downloads_dir": str(DOWNLOADS_DIR),
        "log_dir": str(LOG_DIR),
        "dist_dir": str(DIST_DIR),
        "api_host": API_HOST,
        "api_port": API_PORT,
        "watcher_enabled": WATCHER_ENABLED,
        "watch_downloads": WATCH_DOWNLOADS,
        "cors_origins": "*" if ALLOW_ALL_CORS else CORS_ORIGINS,
    }


def dumps(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), default=str)
