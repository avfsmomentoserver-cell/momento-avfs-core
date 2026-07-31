"""Round persistence + analysis cache.

This module is the only place that writes rounds. It normalises payloads,
enforces deduplication, resolves open forecasts and keeps a short-lived
analysis cache so the dashboards can poll aggressively without re-computing
the full engine on every request.
"""

from __future__ import annotations

import csv
import io
import json
import logging
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from . import analysis, config, db, forecast, linguistics as ling
from .config import AnalysisSettings, RuntimeToggles, BacktestingSettings, DashboardSettings

logger = logging.getLogger("momento.store")

_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_CACHE_TTL = 1.0
_CACHE_LOCK = threading.RLock()


# ---------------------------------------------------------------------------
# settings access
# ---------------------------------------------------------------------------

def analysis_settings() -> AnalysisSettings:
    stored = db.get_setting("analysis") or {}
    return AnalysisSettings().merge(stored)


def runtime_toggles() -> RuntimeToggles:
    stored = db.get_setting("runtime") or {}
    return RuntimeToggles().merge(stored)


def update_analysis_settings(values: Dict[str, Any]) -> AnalysisSettings:
    merged = analysis_settings().merge(values)
    db.set_setting("analysis", merged.as_dict())
    invalidate()
    return merged


def update_runtime_toggles(values: Dict[str, Any]) -> RuntimeToggles:
    merged = runtime_toggles().merge(values)
    db.set_setting("runtime", merged.as_dict())
    invalidate()
    return merged


def backtesting_settings() -> BacktestingSettings:
    stored = db.get_setting("backtesting") or {}
    return BacktestingSettings().merge(stored)


def update_backtesting_settings(values: Dict[str, Any]) -> BacktestingSettings:
    merged = backtesting_settings().merge(values)
    db.set_setting("backtesting", merged.as_dict())
    return merged


def dashboard_settings() -> DashboardSettings:
    stored = db.get_setting("dashboard") or {}
    return DashboardSettings().merge(stored)


def update_dashboard_settings(values: Dict[str, Any]) -> DashboardSettings:
    merged = dashboard_settings().merge(values)
    db.set_setting("dashboard", merged.as_dict())
    return merged


def invalidate(source: Optional[str] = None) -> None:
    with _CACHE_LOCK:
        if source is None:
            _CACHE.clear()
        else:
            for key in [k for k in _CACHE if k.startswith(f"{source}:")]:
                _CACHE.pop(key, None)


# ---------------------------------------------------------------------------
# normalisation
# ---------------------------------------------------------------------------

def normalize_source(value: Any) -> str:
    text = str(value or "aviator").strip().lower().replace(" ", "_").replace("-", "_")
    return "".join(ch for ch in text if ch.isalnum() or ch == "_") or "aviator"


def _normalize_timestamp(value: Any) -> str:
    """Accept ISO strings, epoch seconds and epoch milliseconds."""
    if value is None or value == "":
        return datetime.now(timezone.utc).isoformat(timespec="milliseconds")

    if isinstance(value, (int, float)):
        seconds = float(value)
        if seconds > 1e11:  # milliseconds
            seconds /= 1000.0
        return datetime.fromtimestamp(seconds, tz=timezone.utc).isoformat(timespec="milliseconds")

    text = str(value).strip()
    if text.isdigit():
        return _normalize_timestamp(int(text))
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat(timespec="milliseconds")
    except ValueError:
        return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def normalize_round(raw: Any, default_source: str = "aviator") -> Optional[Dict[str, Any]]:
    """Coerce any collector payload shape into the canonical round record."""
    if isinstance(raw, (int, float)):
        raw = {"multiplier": raw}
    if not isinstance(raw, dict):
        return None

    multiplier_raw = (
        raw.get("multiplier")
        if raw.get("multiplier") is not None
        else raw.get("value") if raw.get("value") is not None
        else raw.get("crash_point") if raw.get("crash_point") is not None
        else raw.get("result") if raw.get("result") is not None
        else raw.get("payout")
    )
    if multiplier_raw is None:
        return None

    try:
        multiplier = float(str(multiplier_raw).replace("x", "").replace("X", "").strip())
    except (TypeError, ValueError):
        return None

    if not (0.0 < multiplier < 1_000_000.0):
        return None
    multiplier = round(max(1.0, multiplier), 2)

    timestamp = _normalize_timestamp(
        raw.get("timestamp") or raw.get("time") or raw.get("created_at") or raw.get("date")
    )
    source = normalize_source(raw.get("source") or raw.get("game") or default_source)

    return {
        "source": source,
        "timestamp": timestamp,
        "multiplier": multiplier,
        "color": str(raw.get("color") or ling.color_for(multiplier)),
        "band": ling.band_for(multiplier)["key"],
        "points": ling.to_points(multiplier),
    }


def extract_rounds(payload: Any, default_source: str = "aviator") -> List[Dict[str, Any]]:
    """Pull round records out of any of the shapes the collectors emit."""
    items: List[Any] = []

    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        for key in ("rounds", "data", "results", "items", "history", "records"):
            value = payload.get(key)
            if isinstance(value, list):
                items = value
                break
        else:
            items = [payload]

    normalized: List[Dict[str, Any]] = []
    for item in items:
        record = normalize_round(item, default_source)
        if record is not None:
            normalized.append(record)
    return normalized


def parse_csv(text: str, default_source: str = "aviator") -> List[Dict[str, Any]]:
    """Parse a CSV export (with or without a header row)."""
    stripped = text.strip()
    if not stripped:
        return []

    sample = stripped.splitlines()[0].lower()
    has_header = any(token in sample for token in ("multiplier", "timestamp", "value", "crash"))

    rows: List[Dict[str, Any]] = []
    if has_header:
        for row in csv.DictReader(io.StringIO(stripped)):
            record = normalize_round({k.strip().lower(): v for k, v in row.items() if k}, default_source)
            if record:
                rows.append(record)
    else:
        for row in csv.reader(io.StringIO(stripped)):
            if not row:
                continue
            if len(row) == 1:
                record = normalize_round({"multiplier": row[0]}, default_source)
            else:
                record = normalize_round({"timestamp": row[0], "multiplier": row[1]}, default_source)
            if record:
                rows.append(record)
    return rows


def parse_text(text: str, default_source: str = "aviator") -> List[Dict[str, Any]]:
    """Try JSON first, then CSV, then a bare newline/comma separated list."""
    stripped = text.strip()
    if not stripped:
        return []
    try:
        return extract_rounds(json.loads(stripped), default_source)
    except json.JSONDecodeError:
        pass

    rows = parse_csv(stripped, default_source)
    if rows:
        return rows

    tokens = [t.strip() for t in stripped.replace(",", "\n").split("\n") if t.strip()]
    return [r for r in (normalize_round({"multiplier": t}, default_source) for t in tokens) if r]


# ---------------------------------------------------------------------------
# writes
# ---------------------------------------------------------------------------

def insert_rounds(
    records: Sequence[Dict[str, Any]],
    method: str = "api",
    source_file: Optional[str] = None,
) -> Dict[str, Any]:
    """Insert normalised rounds, skipping duplicates. Returns an ingest report."""
    imported: List[Dict[str, Any]] = []
    duplicates = 0
    now = db.utc_now()

    for record in records:
        try:
            row_id = db.execute(
                """INSERT INTO rounds
                   (source, timestamp, multiplier, color, band, points, source_file, ingest_method, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    record["source"],
                    record["timestamp"],
                    record["multiplier"],
                    record.get("color"),
                    record.get("band"),
                    record.get("points"),
                    source_file,
                    method,
                    now,
                ),
            )
            stored = dict(record)
            stored["id"] = row_id
            stored["created_at"] = now
            imported.append(stored)
        except Exception as exc:  # sqlite3.IntegrityError for dedupe
            if "UNIQUE" in str(exc).upper():
                duplicates += 1
                continue
            logger.warning("round insert failed: %s", exc)

    sources = {record["source"] for record in imported}
    for source in sources:
        invalidate(source)

    # Score any open forecasts against the rounds that just landed.
    for record in imported:
        try:
            forecast.resolve_pending(record["source"], int(record["id"]), float(record["multiplier"]))
        except Exception as exc:
            logger.debug("forecast resolution skipped: %s", exc)

    report = {
        "imported": len(imported),
        "duplicates": duplicates,
        "rejected": 0,
        "sources": sorted(sources),
        "rounds": imported,
    }

    db.execute(
        """INSERT INTO ingest_log (filename, method, status, source, imported, duplicates, rejected, message, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            source_file,
            method,
            "ok" if imported else ("duplicate" if duplicates else "empty"),
            sorted(sources)[0] if sources else None,
            len(imported),
            duplicates,
            0,
            f"{len(imported)} imported, {duplicates} duplicates",
            now,
        ),
    )
    return report


def ingest_payload(payload: Any, source: str = "aviator", method: str = "api", source_file: Optional[str] = None) -> Dict[str, Any]:
    records = extract_rounds(payload, normalize_source(source))
    if not records:
        db.execute(
            """INSERT INTO ingest_log (filename, method, status, source, imported, duplicates, rejected, message, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (source_file, method, "rejected", normalize_source(source), 0, 0, 1, "No valid rounds found in payload", db.utc_now()),
        )
        return {"imported": 0, "duplicates": 0, "rejected": 1, "sources": [], "rounds": []}
    return insert_rounds(records, method=method, source_file=source_file)


def ingest_file(path: Path, default_source: str = "aviator") -> Dict[str, Any]:
    """Read one file from disk and import every round it contains."""
    text = path.read_text(encoding="utf-8", errors="replace")
    records = parse_text(text, normalize_source(default_source))
    if not records:
        raise ValueError(f"No valid rounds found in {path.name}")
    return insert_rounds(records, method="file", source_file=path.name)


# ---------------------------------------------------------------------------
# reads
# ---------------------------------------------------------------------------

def list_sources() -> List[Dict[str, Any]]:
    rows = db.query("SELECT id, name, icon, active FROM sources ORDER BY name")
    out: List[Dict[str, Any]] = []
    for row in rows:
        counter = db.query_one("SELECT COUNT(*) AS c FROM rounds WHERE source = ?", (row["id"],))
        latest = db.query_one(
            "SELECT timestamp, multiplier FROM rounds WHERE source = ? ORDER BY timestamp DESC LIMIT 1",
            (row["id"],),
        )
        out.append(
            {
                "id": row["id"],
                "name": row["name"],
                "icon": row["icon"],
                "active": bool(row["active"]),
                "round_count": int(counter["c"]) if counter else 0,
                "latest_timestamp": latest["timestamp"] if latest else None,
                "latest_multiplier": round(float(latest["multiplier"]), 2) if latest else None,
            }
        )
    return out


def get_rounds(source: str, limit: int = 200, offset: int = 0, order: str = "desc", ingest_method: Optional[str] = None) -> Dict[str, Any]:
    """Paginated round history, newest first by default."""
    source = normalize_source(source)
    limit = max(1, int(limit))  # Removed cap to allow loading all rounds
    offset = max(0, int(offset))
    direction = "ASC" if str(order).lower() == "asc" else "DESC"

    where_clause = "WHERE source = ?"
    params = [source]
    
    if ingest_method:
        where_clause += " AND ingest_method = ?"
        params.append(ingest_method)

    rows = db.query(
        f"""SELECT id, source, timestamp, multiplier, color, band, points, ingest_method, created_at
            FROM rounds {where_clause} ORDER BY timestamp {direction}, id {direction} LIMIT ? OFFSET ?""",
        (*params, limit, offset),
    )
    total_row = db.query_one(f"SELECT COUNT(*) AS c FROM rounds {where_clause}", tuple(params))

    return {
        "rounds": db.rows_to_dicts(rows),
        "total": int(total_row["c"]) if total_row else 0,
        "limit": limit,
        "offset": offset,
        "source": source,
        "ingest_method": ingest_method,
    }


def history(source: str, limit: int = 600, ingest_method: Optional[str] = None) -> List[Dict[str, Any]]:
    """Oldest-first window used by every analysis call."""
    source = normalize_source(source)
    settings = analysis_settings()
    limit = max(10, min(int(limit), settings.max_rounds_buffer))

    where_clause = "WHERE source = ?"
    params = [source]

    if ingest_method:
        where_clause += " AND ingest_method = ?"
        params.append(ingest_method)

    rows = db.query(
        f"""SELECT id, source, timestamp, multiplier, color, band, points FROM rounds
           {where_clause} ORDER BY timestamp DESC, id DESC LIMIT ?""",
        (*params, limit),
    )
    return list(reversed(db.rows_to_dicts(rows)))


def full_history(source: str, ingest_method: Optional[str] = None) -> List[Dict[str, Any]]:
    """Load all rounds from database for continuous session generation (no limit)."""
    source = normalize_source(source)

    where_clause = "WHERE source = ?"
    params = [source]

    if ingest_method:
        where_clause += " AND ingest_method = ?"
        params.append(ingest_method)

    rows = db.query(
        f"""SELECT id, source, timestamp, multiplier, color, band, points FROM rounds
           {where_clause} ORDER BY timestamp ASC, id ASC""",
        (*params,),
    )
    return db.rows_to_dicts(rows)


def latest_round(source: str) -> Optional[Dict[str, Any]]:
    row = db.query_one(
        """SELECT id, source, timestamp, multiplier, color, band, points FROM rounds
           WHERE source = ? ORDER BY timestamp DESC, id DESC LIMIT 1""",
        (normalize_source(source),),
    )
    return dict(row) if row else None


# ---------------------------------------------------------------------------
# cached analysis
# ---------------------------------------------------------------------------

def analysis_payload(source: str, limit: int = 600, use_cache: bool = True, ingest_method: Optional[str] = None) -> Dict[str, Any]:
    """Full analysis + forecast + accuracy bundle, memoised for one second."""
    source = normalize_source(source)
    key = f"{source}:{limit}:{ingest_method or 'all'}"

    if use_cache:
        with _CACHE_LOCK:
            cached = _CACHE.get(key)
            if cached and (time.monotonic() - cached[0]) < _CACHE_TTL:
                return cached[1]

    settings = analysis_settings()
    toggles = runtime_toggles()
    rounds = history(source, limit, ingest_method)

    if not rounds:
        payload: Dict[str, Any] = {
            "source": source,
            "state": "Idle",
            "state_scores": {},
            "state_meta": {"tone": "neutral", "color": "#8b95b7", "meaning": "No rounds ingested yet"},
            "narrative": "No rounds ingested for this source yet. Start the live feed or import a round file.",
            "prediction_confidence": {"confidence": 0.0, "moonshot_probability": 0.0, "ignition_probability": 0.0},
            "signals": {},
            "distribution": ling.distribution([]),
            "band_histogram": ling.band_histogram([]),
            "percentiles": {},
            "predictions": [],
            "transitions": [],
            "warnings": [{"level": "medium", "code": "no_data", "message": "No rounds available — ingest data to activate the engines."}],
            "accuracy": {"overall": 0.0, "last_10": 0.0, "last_50": 0.0, "total": 0},
            "session": {"active": False, "rounds_available": 0, "count": 0, "avg_round_secs": 0},
            "latest": {"multiplier": 0.0, "band": "—"},
            "config": settings.as_dict(),
            "engines": toggles.as_dict(),
            "empty": True,
        }
        with _CACHE_LOCK:
            _CACHE[key] = (time.monotonic(), payload)
        return payload

    payload = analysis.analyze(rounds, settings, toggles)

    if toggles.forecast_engine:
        fc = forecast.forecast(rounds, settings, payload)
        payload["forecast"] = fc
        payload["predictions"] = fc.get("candidates", [])
    else:
        payload["forecast"] = None
        payload["predictions"] = []

    payload["transitions"] = analysis.state_transitions(rounds, settings) if toggles.signal_engine else []
    payload["accuracy"] = forecast.accuracy(source)
    payload["moonshot_eta"] = analysis.moonshot_eta(rounds, settings)
    payload["mega_scores"] = analysis.mega_moonshot_scores(rounds, settings)
    payload["gap_swing"] = payload["signals"].get("gap_swing", {})
    payload["ml"] = (
        forecast.ml_predictions([float(r["multiplier"]) for r in rounds], settings)
        if toggles.ml_predictions
        else {"available": False, "note": "ML engine disabled"}
    )
    payload["engines"] = toggles.as_dict()
    payload["pending_forecasts"] = forecast.pending_count(source)
    payload["empty"] = False

    with _CACHE_LOCK:
        _CACHE[key] = (time.monotonic(), payload)
    return payload


def persist_forecast(source: str) -> Optional[int]:
    """Store the current forecast so accuracy can be measured later."""
    source = normalize_source(source)
    payload = analysis_payload(source)
    fc = payload.get("forecast")
    if not fc or payload.get("empty"):
        return None
    anchor = latest_round(source)
    return forecast.record(source, fc, int(anchor["id"]) if anchor else None)


def record_metric(source: str, name: str, value: float, detail: Any = None) -> None:
    db.execute(
        "INSERT INTO metrics (source, name, value, detail, created_at) VALUES (?, ?, ?, ?, ?)",
        (normalize_source(source), name, float(value), json.dumps(detail, default=str) if detail else None, db.utc_now()),
    )


def metric_series(source: str, name: str, limit: int = 200) -> List[Dict[str, Any]]:
    rows = db.query(
        "SELECT value, detail, created_at FROM metrics WHERE source = ? AND name = ? ORDER BY created_at DESC LIMIT ?",
        (normalize_source(source), name, max(1, min(int(limit), 2000))),
    )
    return list(reversed(db.rows_to_dicts(rows)))


def rebuild_sessions(source: str, use_full_history: bool = False, use_mega_gap: bool = False) -> int:
    """Recompute the persisted session index from the raw round history.

    Args:
        source: The data source to rebuild sessions for
        use_full_history: If True, load all rounds from DB (no limit) for continuous sessions
        use_mega_gap: If True, use 48-hour gap for mega pressure tracker instead of 5-minute gap
    """
    source = normalize_source(source)
    settings = analysis_settings()

    if use_full_history:
        rounds = full_history(source)
    else:
        rounds = history(source, settings.max_rounds_buffer)

    if not rounds:
        return 0

    gap_seconds = settings.mega_session_gap_seconds if use_mega_gap else settings.session_gap_seconds
    groups = analysis.split_sessions(rounds, gap_seconds)
    db.execute("DELETE FROM sessions WHERE source = ?", (source,))
    now = db.utc_now()
    written = 0
    for group in groups:
        if not group:
            continue
        multipliers = [float(r["multiplier"]) for r in group]
        try:
            db.execute(
                """INSERT INTO sessions (source, started_at, ended_at, round_count, peak, mean, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    source,
                    group[0]["timestamp"],
                    group[-1]["timestamp"],
                    len(group),
                    round(max(multipliers), 2),
                    round(sum(multipliers) / len(multipliers), 4),
                    now,
                ),
            )
            written += 1
        except Exception:
            continue
    return written


def list_sessions(source: str, limit: int = 60) -> List[Dict[str, Any]]:
    rows = db.query(
        """SELECT id, started_at, ended_at, round_count, peak, mean FROM sessions
           WHERE source = ? ORDER BY started_at DESC LIMIT ?""",
        (normalize_source(source), max(1, min(int(limit), 500))),
    )
    return db.rows_to_dicts(rows)


def export_csv(source: str, limit: int = 5000) -> str:
    """CSV export used by the dashboard download buttons."""
    data = get_rounds(source, limit=limit, order="asc")
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "source", "timestamp", "multiplier", "band", "points", "color", "ingest_method"])
    for row in data["rounds"]:
        writer.writerow(
            [row["id"], row["source"], row["timestamp"], row["multiplier"], row["band"], row["points"], row["color"], row["ingest_method"]]
        )
    return buffer.getvalue()


def ingest_history(limit: int = 50) -> List[Dict[str, Any]]:
    rows = db.query(
        """SELECT id, filename, method, status, source, imported, duplicates, rejected, message, created_at
           FROM ingest_log ORDER BY created_at DESC LIMIT ?""",
        (max(1, min(int(limit), 200)),),
    )
    return db.rows_to_dicts(rows)


# ---------------------------------------------------------------------------
# top rounds handling
# ---------------------------------------------------------------------------

def insert_top_rounds(records: Sequence[Dict[str, Any]], source_file: Optional[str] = None) -> Dict[str, Any]:
    """Insert top rounds with session tracking and deduping."""
    imported: List[Dict[str, Any]] = []
    duplicates = 0
    now = db.utc_now()

    for record in records:
        try:
            row_id = db.execute(
                """INSERT INTO top_rounds
                   (source, session_id, timestamp, multiplier, color, raw_html, day_date, hour_interval, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    record["source"],
                    record["session_id"],
                    record["timestamp"],
                    record["multiplier"],
                    record.get("color"),
                    record.get("raw_html"),
                    record["day_date"],
                    record["hour_interval"],
                    now,
                ),
            )
            stored = dict(record)
            stored["id"] = row_id
            stored["created_at"] = now
            imported.append(stored)
        except Exception as exc:
            if "UNIQUE" in str(exc).upper():
                duplicates += 1
                continue
            logger.warning("top round insert failed: %s", exc)

    sources = {record["source"] for record in imported}
    for source in sources:
        invalidate(source)

    report = {
        "imported": len(imported),
        "duplicates": duplicates,
        "rejected": 0,
        "sources": sorted(sources),
        "top_rounds": imported,
    }

    db.execute(
        """INSERT INTO ingest_log (filename, method, status, source, imported, duplicates, rejected, message, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            source_file,
            "top_rounds",
            "ok" if imported else ("duplicate" if duplicates else "empty"),
            sorted(sources)[0] if sources else None,
            len(imported),
            duplicates,
            0,
            f"{len(imported)} top rounds imported, {duplicates} duplicates",
            now,
        ),
    )
    return report


def ingest_top_rounds_payload(payload: Any, source: str = "aviator", source_file: Optional[str] = None) -> Dict[str, Any]:
    """Process top rounds payload from collector."""
    if isinstance(payload, dict):
        records = payload.get("top_rounds", [])
    elif isinstance(payload, list):
        records = payload
    else:
        return {"imported": 0, "duplicates": 0, "rejected": 1, "sources": [], "top_rounds": []}

    if not records:
        return {"imported": 0, "duplicates": 0, "rejected": 1, "sources": [], "top_rounds": []}

    normalized = []
    for record in records:
        if not isinstance(record, dict):
            continue
        if not all(k in record for k in ["timestamp", "multiplier", "session_id", "day_date", "hour_interval"]):
            continue
        normalized.append({
            "source": normalize_source(source),
            "timestamp": record["timestamp"],
            "multiplier": float(record["multiplier"]),
            "color": record.get("color"),
            "raw_html": record.get("raw_html"),
            "session_id": record["session_id"],
            "day_date": record["day_date"],
            "hour_interval": record["hour_interval"],
        })

    return insert_top_rounds(normalized, source_file)


def get_top_rounds(source: str, limit: int = 100, session_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve top rounds with optional session filtering."""
    source = normalize_source(source)
    limit = max(1, min(int(limit), 1000))

    where_clause = "WHERE source = ?"
    params = [source]

    if session_id:
        where_clause += " AND session_id = ?"
        params.append(session_id)

    rows = db.query(
        f"""SELECT id, source, session_id, timestamp, multiplier, color, day_date, hour_interval, created_at
            FROM top_rounds {where_clause} ORDER BY timestamp DESC LIMIT ?""",
        (*params, limit),
    )

    return {
        "top_rounds": db.rows_to_dicts(rows),
        "count": len(rows),
        "source": source,
        "session_id": session_id,
    }


def get_latest_session_top_rounds(source: str) -> Optional[Dict[str, Any]]:
    """Get the most recent session's top rounds."""
    source = normalize_source(source)
    row = db.query_one(
        """SELECT session_id FROM top_rounds WHERE source = ? ORDER BY timestamp DESC LIMIT 1""",
        (source,),
    )

    if not row:
        return None

    return get_top_rounds(source, limit=500, session_id=row["session_id"])


def get_top_rounds_by_day(source: str, day_date: str) -> Dict[str, Any]:
    """Get top rounds for a specific day with hourly intervals."""
    source = normalize_source(source)
    rows = db.query(
        """SELECT id, source, session_id, timestamp, multiplier, color, day_date, hour_interval, created_at
            FROM top_rounds WHERE source = ? AND day_date = ? ORDER BY hour_interval, timestamp DESC""",
        (source, day_date),
    )

    return {
        "top_rounds": db.rows_to_dicts(rows),
        "count": len(rows),
        "source": source,
        "day_date": day_date,
    }