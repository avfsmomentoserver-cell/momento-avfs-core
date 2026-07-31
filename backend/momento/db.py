"""SQLite persistence layer.

Uses WAL journaling so the ingest watcher and the API can read/write
concurrently without locking each other out.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Iterator, List, Optional, Sequence

from . import config
from .vocabulary_schema import VOCABULARY_SCHEMA

_LOCK = threading.RLock()
_LOCAL = threading.local()


SCHEMA = """
CREATE TABLE IF NOT EXISTS rounds (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    source        TEXT    NOT NULL,
    timestamp     TEXT    NOT NULL,
    multiplier    REAL    NOT NULL,
    color         TEXT,
    band          TEXT,
    points        REAL,
    source_file   TEXT,
    ingest_method TEXT    NOT NULL DEFAULT 'api',
    created_at    TEXT    NOT NULL,
    UNIQUE (source, timestamp, multiplier, ingest_method)
);
CREATE INDEX IF NOT EXISTS idx_rounds_source_ts ON rounds (source, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_created ON rounds (created_at DESC);

CREATE TABLE IF NOT EXISTS forecasts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    source           TEXT    NOT NULL,
    created_at       TEXT    NOT NULL,
    anchor_round_id  INTEGER,
    horizon          INTEGER NOT NULL,
    predicted_state  TEXT    NOT NULL,
    predicted_band   TEXT,
    confidence       REAL    NOT NULL,
    range_lo         REAL    NOT NULL,
    range_hi         REAL    NOT NULL,
    engine           TEXT    NOT NULL DEFAULT 'forecast',
    resolved         INTEGER NOT NULL DEFAULT 0,
    correct          INTEGER,
    actual_multiplier REAL,
    resolved_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_forecasts_source ON forecasts (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forecasts_resolved ON forecasts (source, resolved);

CREATE TABLE IF NOT EXISTS metrics (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    source     TEXT NOT NULL,
    name       TEXT NOT NULL,
    value      REAL NOT NULL,
    detail     TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_metrics_lookup ON metrics (source, name, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source      TEXT NOT NULL,
    started_at  TEXT NOT NULL,
    ended_at    TEXT NOT NULL,
    round_count INTEGER NOT NULL,
    peak        REAL NOT NULL,
    mean        REAL NOT NULL,
    created_at  TEXT NOT NULL,
    UNIQUE (source, started_at)
);

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    tier          TEXT NOT NULL DEFAULT 'free',
    display_name  TEXT,
    created_at    TEXT NOT NULL,
    last_login    TEXT,
    active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sources (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    icon       TEXT,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugins (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    version     TEXT NOT NULL,
    author      TEXT,
    description TEXT,
    category    TEXT NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1,
    config      TEXT NOT NULL DEFAULT '{}',
    builtin     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id       TEXT NOT NULL,
    source          TEXT NOT NULL,
    signal          TEXT,
    score           REAL,
    processing_ms   REAL,
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_plugin_runs ON plugin_runs (plugin_id, created_at DESC);

CREATE TABLE IF NOT EXISTS autopilot_decisions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    source         TEXT NOT NULL,
    round_id       INTEGER,
    created_at     TEXT NOT NULL,
    action         TEXT NOT NULL,
    position_size  REAL NOT NULL,
    entry_point    REAL NOT NULL,
    exit_point     REAL NOT NULL,
    stop_loss      REAL NOT NULL,
    confidence     REAL NOT NULL,
    primary_signal TEXT,
    signals        TEXT,
    risk           TEXT,
    resolved       INTEGER NOT NULL DEFAULT 0,
    pnl            REAL,
    won            INTEGER,
    resolved_at    TEXT
);

CREATE TABLE IF NOT EXISTS backtest_runs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    source           TEXT NOT NULL,
    config           TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending',
    total_sessions   INTEGER NOT NULL DEFAULT 0,
    sessions_tested  INTEGER NOT NULL DEFAULT 0,
    baseline_accuracy REAL,
    feature_accuracy REAL,
    impact_score     REAL,
    results          TEXT,
    error            TEXT,
    started_at       TEXT,
    completed_at     TEXT,
    created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_source ON backtest_runs (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autopilot_source ON autopilot_decisions (source, created_at DESC);

CREATE TABLE IF NOT EXISTS ingest_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    filename   TEXT,
    method     TEXT NOT NULL,
    status     TEXT NOT NULL,
    source     TEXT,
    imported   INTEGER NOT NULL DEFAULT 0,
    duplicates INTEGER NOT NULL DEFAULT 0,
    rejected   INTEGER NOT NULL DEFAULT 0,
    message    TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ingest_log ON ingest_log (created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS build_steps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT NOT NULL UNIQUE,
    ordinal     INTEGER NOT NULL,
    title       TEXT NOT NULL,
    summary     TEXT,
    status      TEXT NOT NULL DEFAULT 'complete',
    doc_file    TEXT,
    bundle_file TEXT,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    actor      TEXT,
    action     TEXT NOT NULL,
    detail     TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);

CREATE TABLE IF NOT EXISTS top_rounds (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    source        TEXT    NOT NULL,
    session_id    TEXT    NOT NULL,
    timestamp     TEXT    NOT NULL,
    multiplier    REAL    NOT NULL,
    color         TEXT,
    raw_html      TEXT,
    day_date      TEXT    NOT NULL,
    hour_interval INTEGER NOT NULL,
    created_at    TEXT    NOT NULL,
    UNIQUE (source, session_id, timestamp, multiplier)
);
CREATE INDEX IF NOT EXISTS idx_top_rounds_source_session ON top_rounds (source, session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_top_rounds_day ON top_rounds (source, day_date, hour_interval);
""" + "\n" + VOCABULARY_SCHEMA


def utc_now() -> str:
    """ISO-8601 UTC timestamp used for every `created_at` column."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def _configure(conn: sqlite3.Connection) -> None:
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")


def connection() -> sqlite3.Connection:
    """Thread-local connection so FastAPI worker threads stay isolated."""
    conn = getattr(_LOCAL, "conn", None)
    if conn is None:
        config.ensure_directories()
        conn = sqlite3.connect(str(config.DATABASE_PATH), timeout=10, check_same_thread=False)
        _configure(conn)
        _LOCAL.conn = conn
    return conn


@contextmanager
def transaction() -> Iterator[sqlite3.Connection]:
    conn = connection()
    with _LOCK:
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def query(sql: str, params: Sequence[Any] = ()) -> List[sqlite3.Row]:
    return list(connection().execute(sql, params).fetchall())


def query_one(sql: str, params: Sequence[Any] = ()) -> Optional[sqlite3.Row]:
    return connection().execute(sql, params).fetchone()


def execute(sql: str, params: Sequence[Any] = ()) -> int:
    with transaction() as conn:
        cursor = conn.execute(sql, params)
        return cursor.lastrowid or cursor.rowcount


def rows_to_dicts(rows: Iterable[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [dict(row) for row in rows]


# ---------------------------------------------------------------------------
# settings helpers
# ---------------------------------------------------------------------------

def set_setting(key: str, value: Any) -> None:
    execute(
        """INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at""",
        (key, json.dumps(value, default=str), utc_now()),
    )


def get_setting(key: str, default: Any = None) -> Any:
    row = query_one("SELECT value FROM settings WHERE key = ?", (key,))
    if row is None:
        return default
    try:
        return json.loads(row["value"])
    except (json.JSONDecodeError, TypeError):
        return default


def log_audit(actor: Optional[str], action: str, detail: Any = None) -> None:
    execute(
        "INSERT INTO audit_log (actor, action, detail, created_at) VALUES (?, ?, ?, ?)",
        (actor, action, json.dumps(detail, default=str) if detail is not None else None, utc_now()),
    )


def init_db() -> None:
    """Create the schema and seed reference data. Safe to call repeatedly."""
    config.ensure_directories()
    with transaction() as conn:
        conn.executescript(SCHEMA)

    now = utc_now()
    for entry in config.DEFAULT_SOURCES:
        execute(
            """INSERT INTO sources (id, name, icon, active, created_at) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(id) DO NOTHING""",
            (entry["id"], entry["name"], entry["icon"], 1 if entry["active"] else 0, now),
        )

    if get_setting("analysis") is None:
        set_setting("analysis", config.AnalysisSettings().as_dict())
    if get_setting("runtime") is None:
        set_setting("runtime", config.RuntimeToggles().as_dict())


def stats() -> Dict[str, Any]:
    """Database level counters shown on the health and settings screens."""
    counts: Dict[str, Any] = {}
    for table in ("rounds", "forecasts", "metrics", "users", "plugins", "autopilot_decisions", "ingest_log"):
        row = query_one(f"SELECT COUNT(*) AS c FROM {table}")
        counts[table] = int(row["c"]) if row else 0

    size = config.DATABASE_PATH.stat().st_size if config.DATABASE_PATH.exists() else 0
    newest = query_one("SELECT timestamp FROM rounds ORDER BY timestamp DESC LIMIT 1")
    oldest = query_one("SELECT timestamp FROM rounds ORDER BY timestamp ASC LIMIT 1")
    return {
        "counts": counts,
        "size_bytes": size,
        "path": str(config.DATABASE_PATH),
        "newest_round": newest["timestamp"] if newest else None,
        "oldest_round": oldest["timestamp"] if oldest else None,
    }
