"""Global Database for Cross-Branch Data Sharing.

This module provides a centralized database system that allows different branches
(main, fx, etc.) to share the same data source while maintaining separate
logic and processing capabilities.

Architecture:
- Global tables: Shared across all branches (rounds, sources, users, audit_log)
- Branch-specific tables: Prefixed with branch name (fx_state_snapshots, main_forecasts, etc.)
- Connection pooling: Thread-safe connections with WAL journaling
- Branch isolation: Each branch uses its own logical schema within shared database
"""

from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

# Global database configuration
GLOBAL_DB_PATH = Path("/home/pirates/Avfs_Core/global_data/momento_global.db")
GLOBAL_DATA_DIR = GLOBAL_DB_PATH.parent

_LOCK = threading.RLock()
_LOCAL = threading.local()


def ensure_global_directories() -> None:
    """Create global data directory structure."""
    GLOBAL_DATA_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================================
# GLOBAL SCHEMA (Shared Across All Branches)
# ============================================================================

GLOBAL_SCHEMA = """
-- Core data tables (shared across all branches)
CREATE TABLE IF NOT EXISTS rounds (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    source        TEXT    NOT NULL,
    timestamp     TEXT    NOT NULL,
    multiplier    REAL    NOT NULL,
    raw_data      TEXT,           -- Store original data for different processing
    data_type     TEXT    NOT NULL DEFAULT 'crash',  -- crash, forex, etc.
    ingest_method TEXT    NOT NULL DEFAULT 'global_watcher',
    created_at    TEXT    NOT NULL,
    UNIQUE (source, timestamp, multiplier, ingest_method)
);
CREATE INDEX IF NOT EXISTS idx_rounds_source_ts ON rounds (source, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_data_type ON rounds (data_type, timestamp DESC);

CREATE TABLE IF NOT EXISTS sources (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    data_type  TEXT NOT NULL DEFAULT 'crash',  -- crash, forex, crypto, etc.
    icon       TEXT,
    active     INTEGER NOT NULL DEFAULT 1,
    config     TEXT,  -- Branch-specific configuration can be stored here
    created_at TEXT NOT NULL
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

CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    branch     TEXT NOT NULL,  -- Which branch performed the action
    actor      TEXT,
    action     TEXT NOT NULL,
    detail     TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_branch ON audit_log (branch, created_at DESC);

CREATE TABLE IF NOT EXISTS branch_metadata (
    branch_name TEXT PRIMARY KEY,
    active      INTEGER NOT NULL DEFAULT 1,
    last_sync   TEXT,
    config      TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
"""


# ============================================================================
# BRANCH-SPECIFIC SCHEMA TEMPLATES
# ============================================================================

BRANCH_SCHEMAS = {
    "fx": """
-- FX branch specific tables
CREATE TABLE IF NOT EXISTS fx_state_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source          TEXT    NOT NULL,
    timestamp       TEXT    NOT NULL,
    state           TEXT    NOT NULL,
    trend           TEXT    NOT NULL,
    volatility      TEXT    NOT NULL,
    compression     REAL,
    expansion       REAL,
    momentum        REAL,
    liquidity       REAL,
    entropy         REAL,
    dna_signature   TEXT,
    dna_confidence  REAL,
    created_at      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fx_state_source ON fx_state_snapshots (source, timestamp DESC);

CREATE TABLE IF NOT EXISTS fx_state_transitions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    source            TEXT    NOT NULL,
    from_state        TEXT    NOT NULL,
    to_state          TEXT    NOT NULL,
    probability       REAL,
    timestamp         TEXT    NOT NULL,
    created_at        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fx_transitions_source ON fx_state_transitions (source, timestamp DESC);

CREATE TABLE IF NOT EXISTS fx_dna_signatures (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    signature       TEXT    NOT NULL,
    confidence      REAL,
    outcome_type    TEXT,
    outcome_value   REAL,
    match_count     INTEGER,
    last_seen       TEXT,
    created_at      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fx_dna_signature ON fx_dna_signatures (signature);
""",
    
    "main": """
-- Main branch specific tables
CREATE TABLE IF NOT EXISTS main_forecasts (
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
CREATE INDEX IF NOT EXISTS idx_main_forecasts_source ON main_forecasts (source, created_at DESC);

CREATE TABLE IF NOT EXISTS main_analysis_results (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    source        TEXT    NOT NULL,
    analysis_type TEXT    NOT NULL,
    result_data   TEXT    NOT NULL,
    created_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_main_analysis_source ON main_analysis_results (source, analysis_type, created_at DESC);
""",
}


# ============================================================================
# DATABASE CONNECTION MANAGEMENT
# ============================================================================

def _configure(conn: sqlite3.Connection) -> None:
    """Configure connection for concurrent access."""
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")


def connection() -> sqlite3.Connection:
    """Thread-local connection for global database."""
    conn = getattr(_LOCAL, "conn", None)
    if conn is None:
        ensure_global_directories()
        conn = sqlite3.connect(str(GLOBAL_DB_PATH), timeout=10, check_same_thread=False)
        _configure(conn)
        _LOCAL.conn = conn
    return conn


@contextmanager
def transaction() -> Iterator[sqlite3.Connection]:
    """Transaction context manager."""
    conn = connection()
    with _LOCK:
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def utc_now() -> str:
    """ISO-8601 UTC timestamp."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


# ============================================================================
# DATABASE INITIALIZATION
# ============================================================================

def init_global_db() -> None:
    """Initialize global database with shared schema."""
    ensure_global_directories()
    
    with transaction() as conn:
        # Create global schema
        for statement in GLOBAL_SCHEMA.split(';'):
            statement = statement.strip()
            if statement:
                conn.execute(statement)
        
        # Register branches
        register_branch("main", active=True)
        register_branch("fx", active=True)


def init_branch_schema(branch_name: str) -> None:
    """Initialize branch-specific schema if not exists."""
    if branch_name not in BRANCH_SCHEMAS:
        return
    
    with transaction() as conn:
        schema = BRANCH_SCHEMAS[branch_name]
        for statement in schema.split(';'):
            statement = statement.strip()
            if statement:
                try:
                    conn.execute(statement)
                except sqlite3.OperationalError as e:
                    # Ignore errors if table already exists
                    if "already exists" not in str(e):
                        raise


def register_branch(branch_name: str, active: bool = True) -> None:
    """Register a branch in the metadata table."""
    with transaction() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO branch_metadata (branch_name, active, config, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (branch_name, 1 if active else 0, '{}', utc_now(), utc_now()))


# ============================================================================
# GLOBAL DATA OPERATIONS (Shared Across Branches)
# ============================================================================

def ingest_round(round_data: Dict[str, Any], data_type: str = "crash") -> int:
    """Ingest a round into the global database."""
    with transaction() as conn:
        cursor = conn.execute("""
            INSERT INTO rounds (source, timestamp, multiplier, raw_data, data_type, ingest_method, created_at)
            VALUES (?, ?, ?, ?, ?, 'global_watcher', ?)
        """, (
            round_data["source"],
            round_data["timestamp"],
            round_data["multiplier"],
            round_data.get("raw_data", "{}"),
            data_type,
            utc_now()
        ))
        return cursor.lastrowid


def get_rounds(source: str, limit: int = 100, offset: int = 0, 
                data_type: Optional[str] = None) -> Dict[str, Any]:
    """Get rounds from global database."""
    with transaction() as conn:
        query = "SELECT * FROM rounds WHERE source = ?"
        params = [source]
        
        if data_type:
            query += " AND data_type = ?"
            params.append(data_type)
        
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        rows = conn.execute(query, params).fetchall()
        return {
            "data": [dict(row) for row in rows],
            "source": source,
            "count": len(rows),
            "limit": limit,
            "offset": offset
        }


def register_source(source_config: Dict[str, Any]) -> None:
    """Register a data source in the global database."""
    with transaction() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO sources (id, name, data_type, icon, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            source_config["id"],
            source_config["name"],
            source_config.get("data_type", "crash"),
            source_config.get("icon"),
            1 if source_config.get("active", True) else 0,
            utc_now()
        ))


def get_sources() -> Dict[str, Any]:
    """Get all registered sources."""
    with transaction() as conn:
        rows = conn.execute("SELECT * FROM sources WHERE active = 1").fetchall()
        return {
            "sources": [dict(row) for row in rows],
            "count": len(rows)
        }


def log_audit(branch: str, actor: str, action: str, detail: str = "") -> None:
    """Log an audit event for cross-branch tracking."""
    with transaction() as conn:
        conn.execute("""
            INSERT INTO audit_log (branch, actor, action, detail, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (branch, actor, action, detail, utc_now()))


# ============================================================================
# BRANCH-SPECIFIC DATA OPERATIONS
# ============================================================================

def store_branch_data(branch: str, table: str, data: Dict[str, Any]) -> int:
    """Store branch-specific data in prefixed table."""
    table_name = f"{branch}_{table}"
    
    # Build dynamic insert statement
    columns = list(data.keys())
    placeholders = ", ".join(["?"] * len(columns))
    columns_str = ", ".join(columns)
    
    with transaction() as conn:
        # Add created_at if not present
        if "created_at" not in data:
            columns.append("created_at")
            data["created_at"] = utc_now()
            placeholders += ", ?"
        
        cursor = conn.execute(f"""
            INSERT INTO {table_name} ({columns_str})
            VALUES ({placeholders})
        """, list(data.values()))
        return cursor.lastrowid


def get_branch_data(branch: str, table: str, source: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Get branch-specific data from prefixed table."""
    table_name = f"{branch}_{table}"
    
    with transaction() as conn:
        query = f"SELECT * FROM {table_name} WHERE source = ? ORDER BY timestamp DESC LIMIT ?"
        rows = conn.execute(query, (source, limit)).fetchall()
        return [dict(row) for row in rows]


def get_branch_metadata(branch: str) -> Dict[str, Any]:
    """Get metadata for a specific branch."""
    with transaction() as conn:
        row = conn.execute("SELECT * FROM branch_metadata WHERE branch_name = ?", (branch,)).fetchone()
        return dict(row) if row else {}


def update_branch_sync(branch: str) -> None:
    """Update the last sync timestamp for a branch."""
    with transaction() as conn:
        conn.execute("""
            UPDATE branch_metadata 
            SET last_sync = ?, updated_at = ?
            WHERE branch_name = ?
        """, (utc_now(), utc_now(), branch))


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_database_stats() -> Dict[str, Any]:
    """Get statistics about the global database."""
    with transaction() as conn:
        stats = {}
        
        # Round counts by data type
        for data_type in ["crash", "forex", "crypto"]:
            count = conn.execute(
                "SELECT COUNT(*) as c FROM rounds WHERE data_type = ?", 
                (data_type,)
            ).fetchone()
            stats[f"{data_type}_rounds"] = count["c"] if count else 0
        
        # Source counts
        stats["total_sources"] = conn.execute("SELECT COUNT(*) as c FROM sources").fetchone()["c"]
        
        # User counts
        stats["total_users"] = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
        
        # Branch status
        branches = conn.execute("SELECT * FROM branch_metadata").fetchall()
        stats["branches"] = [dict(row) for row in branches]
        
        # Database size
        db_size = GLOBAL_DB_PATH.stat().st_size if GLOBAL_DB_PATH.exists() else 0
        stats["database_size_bytes"] = db_size
        
        return stats


def cleanup_old_data(days: int = 30) -> int:
    """Clean up data older than specified days."""
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    cutoff_str = cutoff.isoformat()
    
    with transaction() as conn:
        # Clean up old audit logs
        result = conn.execute(
            "DELETE FROM audit_log WHERE created_at < ?", 
            (cutoff_str,)
        )
        return result.rowcount


# Initialize on import
init_global_db()