"""Health, runtime settings, sources and audit endpoints."""

from __future__ import annotations

import platform
import time
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

from ... import __version__, config, db, plugins, store
from ...feed import feed
from ...hub import hub
from ...watcher import watcher
from ..deps import operator_user
from ..schemas import SettingsUpdateRequest, SourceUpsertRequest

router = APIRouter()
_BOOTED_AT = time.time()


@router.get("/health")
async def health() -> Dict[str, Any]:
    """Liveness + a full picture of every subsystem."""
    return {
        "status": "healthy",
        "version": __version__,
        "uptime_seconds": round(time.time() - _BOOTED_AT, 1),
        "database": db.stats(),
        "websocket": hub.stats(),
        "watcher": watcher.status(),
        "feed": feed.status(),
        "python": platform.python_version(),
        "host": platform.node(),
        "config": config.describe(),
        "timestamp": db.utc_now(),
    }


@router.get("/engines/health")
async def engines_health() -> Dict[str, Any]:
    """Per-engine health, driven by the runtime toggles and live plugin state."""
    toggles = store.runtime_toggles().as_dict()
    plugin_stats = plugins.statistics_summary()
    sources = store.list_sources()
    total_rounds = sum(int(s["round_count"]) for s in sources)

    engines: List[Dict[str, Any]] = []
    for name, enabled in toggles.items():
        engines.append(
            {
                "name": name,
                "enabled": bool(enabled),
                "status": "healthy" if enabled else "disabled",
            }
        )

    return {
        "status": "healthy" if toggles.get("engines_enabled") else "degraded",
        "engines": engines,
        "plugins": {
            "total": plugin_stats["total_plugins"],
            "active": plugin_stats["active_plugins"],
            "signals_generated": plugin_stats["total_signals_generated"],
        },
        "data": {"sources": len(sources), "total_rounds": total_rounds},
        "timestamp": db.utc_now(),
    }


@router.get("/versions")
async def versions() -> Dict[str, Any]:
    return {
        "platform": __version__,
        "api": "v1",
        "routes": ["/api/v1"],
        "engines": ["signal", "market", "forecast", "linguistics", "orchestrator", "autopilot", "ml"],
    }


@router.get("/settings")
async def get_settings() -> Dict[str, Any]:
    return {
        "analysis": store.analysis_settings().as_dict(),
        "runtime": store.runtime_toggles().as_dict(),
        "backtesting": store.backtesting_settings().as_dict(),
        "dashboard": store.dashboard_settings().as_dict(),
        "environment": config.describe(),
        "database": db.stats(),
    }


@router.put("/settings")
async def update_settings(
    body: SettingsUpdateRequest,
    user: Dict[str, Any] = Depends(operator_user),
) -> Dict[str, Any]:
    if body.analysis:
        store.update_analysis_settings(body.analysis)
    if body.runtime:
        store.update_runtime_toggles(body.runtime)
    if body.backtesting:
        store.update_backtesting_settings(body.backtesting)
    if body.dashboard:
        store.update_dashboard_settings(body.dashboard)
    db.log_audit(
        user["email"],
        "settings_update",
        {
            "analysis": body.analysis,
            "runtime": body.runtime,
            "backtesting": body.backtesting,
            "dashboard": body.dashboard,
        },
    )
    return {
        "analysis": store.analysis_settings().as_dict(),
        "runtime": store.runtime_toggles().as_dict(),
        "backtesting": store.backtesting_settings().as_dict(),
        "dashboard": store.dashboard_settings().as_dict(),
    }


@router.get("/sources")
async def list_sources() -> Dict[str, Any]:
    return {"sources": store.list_sources()}


@router.post("/sources")
async def upsert_source(
    body: SourceUpsertRequest,
    user: Dict[str, Any] = Depends(operator_user),
) -> Dict[str, Any]:
    source_id = store.normalize_source(body.id)
    db.execute(
        """INSERT INTO sources (id, name, icon, active, created_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, icon = excluded.icon, active = excluded.active""",
        (source_id, body.name.strip()[:60], body.icon or "activity", 1 if body.active else 0, db.utc_now()),
    )
    db.log_audit(user["email"], "source_upsert", {"id": source_id})
    return {"sources": store.list_sources()}


@router.delete("/sources/{source_id}")
async def delete_source(source_id: str, user: Dict[str, Any] = Depends(operator_user)) -> Dict[str, Any]:
    normalized = store.normalize_source(source_id)
    if db.query_one("SELECT id FROM sources WHERE id = ?", (normalized,)) is None:
        raise HTTPException(status_code=404, detail="Source not found")
    db.execute("DELETE FROM sources WHERE id = ?", (normalized,))
    db.log_audit(user["email"], "source_delete", {"id": normalized})
    return {"sources": store.list_sources()}


@router.delete("/sources/{source_id}/rounds")
async def purge_source(source_id: str, user: Dict[str, Any] = Depends(operator_user)) -> Dict[str, Any]:
    deleted = store.purge_source(source_id)
    db.log_audit(user["email"], "source_purge", {"id": source_id, "deleted": deleted})
    return {"deleted": deleted, "source": store.normalize_source(source_id)}


@router.get("/audit")
async def audit(limit: int = 100, user: Dict[str, Any] = Depends(operator_user)) -> Dict[str, Any]:
    rows = db.query(
        "SELECT id, actor, action, detail, created_at FROM audit_log ORDER BY created_at DESC LIMIT ?",
        (max(1, min(int(limit), 500)),),
    )
    return {"entries": db.rows_to_dicts(rows)}


@router.get("/feed/status")
async def feed_status() -> Dict[str, Any]:
    """Feed status for frontend polling."""
    return feed.status()
