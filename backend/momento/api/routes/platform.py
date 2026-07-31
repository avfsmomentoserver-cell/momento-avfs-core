"""Build steps, documentation index and downloadable source bundles.

The dashboard's Build Steps screen reads from here: every implementation step
has a markdown document and a zipped source bundle on disk, and this router
exposes both the index and the file downloads.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse

from ... import config, db
from ..deps import operator_user

router = APIRouter()

MANIFEST_NAME = "manifest.json"


def _manifest() -> Dict[str, Any]:
    path = config.DIST_DIR / MANIFEST_NAME
    if not path.exists():
        return {"generated_at": None, "steps": []}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"generated_at": None, "steps": []}


def _file_info(directory: Path, name: Optional[str]) -> Optional[Dict[str, Any]]:
    if not name:
        return None
    path = directory / name
    if not path.exists() or not path.is_file():
        return None
    return {"name": name, "size_bytes": path.stat().st_size, "exists": True}


@router.get("/platform/build-steps")
async def build_steps() -> Dict[str, Any]:
    """Every implementation step with its doc + source bundle download links."""
    manifest = _manifest()
    steps: List[Dict[str, Any]] = []

    for entry in manifest.get("steps", []):
        doc_name = entry.get("doc_file")
        bundle_name = entry.get("bundle_file")
        steps.append(
            {
                "slug": entry.get("slug"),
                "ordinal": entry.get("ordinal"),
                "title": entry.get("title"),
                "summary": entry.get("summary"),
                "status": entry.get("status", "complete"),
                "highlights": entry.get("highlights", []),
                "doc": {
                    **(_file_info(config.DIST_DIR, doc_name) or {"name": doc_name, "exists": False, "size_bytes": 0}),
                    "url": f"/api/v1/platform/download/{doc_name}" if doc_name else None,
                    "view_url": f"/api/v1/platform/doc/{entry.get('slug')}" if doc_name else None,
                },
                "bundle": {
                    **(_file_info(config.DIST_DIR, bundle_name) or {"name": bundle_name, "exists": False, "size_bytes": 0}),
                    "url": f"/api/v1/platform/download/{bundle_name}" if bundle_name else None,
                },
            }
        )

    steps.sort(key=lambda item: int(item.get("ordinal") or 0))
    bundle_all = _file_info(config.DIST_DIR, manifest.get("full_bundle"))

    return {
        "generated_at": manifest.get("generated_at"),
        "steps": steps,
        "downloads_dir": str(config.DIST_DIR),
        "full_bundle": (
            {**bundle_all, "url": f"/api/v1/platform/download/{manifest.get('full_bundle')}"}
            if bundle_all
            else None
        ),
        "total_steps": len(steps),
    }


@router.get("/platform/doc/{slug}")
async def read_doc(slug: str) -> PlainTextResponse:
    """Return one step document as markdown text for in-app rendering."""
    manifest = _manifest()
    entry = next((s for s in manifest.get("steps", []) if s.get("slug") == slug), None)
    if entry is None or not entry.get("doc_file"):
        raise HTTPException(status_code=404, detail="Step document not found")

    path = (config.DIST_DIR / str(entry["doc_file"])).resolve()
    if not path.exists() or config.DIST_DIR.resolve() not in path.parents:
        raise HTTPException(status_code=404, detail="Step document missing on disk")
    return PlainTextResponse(path.read_text(encoding="utf-8"), media_type="text/markdown")


@router.get("/platform/download/{filename}")
async def download(filename: str) -> FileResponse:
    """Serve a step document or source bundle from the downloads folder."""
    safe = Path(filename).name
    path = (config.DIST_DIR / safe).resolve()
    if not path.exists() or not path.is_file() or config.DIST_DIR.resolve() not in path.parents:
        raise HTTPException(status_code=404, detail="File not found")

    media = "application/zip" if path.suffix == ".zip" else ("text/markdown" if path.suffix == ".md" else "application/octet-stream")
    return FileResponse(path, media_type=media, filename=safe)


@router.get("/platform/docs")
async def docs_index() -> Dict[str, Any]:
    """List the markdown documentation shipped with the repository."""
    entries: List[Dict[str, Any]] = []
    if config.DOCS_DIR.exists():
        for path in sorted(config.DOCS_DIR.rglob("*.md")):
            entries.append(
                {
                    "name": path.name,
                    "relative_path": str(path.relative_to(config.DOCS_DIR)),
                    "size_bytes": path.stat().st_size,
                }
            )
    return {"docs_dir": str(config.DOCS_DIR), "documents": entries, "count": len(entries)}


@router.get("/platform/overview")
async def overview() -> Dict[str, Any]:
    """Sub-project map rendered by the platform Bird's Eye screen."""
    return {
        "platform": "AVFS / Momento Core",
        "pipeline": ["Collector", "Ingest API", "Analysis", "Forecast Engine", "Database", "Dashboard"],
        "sub_projects": [
            {
                "id": "collector",
                "name": "Collector & Ingest",
                "description": "File watcher, REST push, upload console and the provably-fair live round engine.",
                "surface": "/dashboard/ingest",
                "engines": ["watcher", "live-feed"],
            },
            {
                "id": "analysis",
                "name": "Analysis Core",
                "description": "Ladders, resistance, streaks, distributions, regimes and house-edge fitting.",
                "surface": "/dashboard",
                "engines": ["signal_engine", "market_engine"],
            },
            {
                "id": "linguistics",
                "name": "MomentoLinguistics",
                "description": "Eight-layer semantic language: bands, energy, shape, state and narrative.",
                "surface": "/dashboard/linguistics",
                "engines": ["linguistics_engine"],
            },
            {
                "id": "forecast",
                "name": "Forecast Engine",
                "description": "Markov transitions, percentile ranges and DNA analogue matching with measured accuracy.",
                "surface": "/dashboard/crash-studio",
                "engines": ["forecast_engine", "ml_predictions"],
            },
            {
                "id": "orchestrator",
                "name": "Decision Orchestrator",
                "description": "Patience, speed, risk and mistake-prevention engines producing one instruction.",
                "surface": "/orchestrator",
                "engines": ["orchestrator"],
            },
            {
                "id": "autopilot",
                "name": "Autopilot Ledger",
                "description": "Records and scores decisions so the platform's reasoning is measurable.",
                "surface": "/dashboard/autopilot",
                "engines": ["autopilot_engine"],
            },
            {
                "id": "inventory",
                "name": "Plugin Inventory",
                "description": "Plug-and-play analyzers with live weights, thresholds and performance history.",
                "surface": "/inventory",
                "engines": ["plugin_registry"],
            },
            {
                "id": "app",
                "name": "Consumer App",
                "description": "Simplified daily guidance surface with premium prediction tiers.",
                "surface": "/app",
                "engines": ["forecast_engine"],
            },
        ],
        "database": db.stats(),
    }


@router.post("/platform/build-steps/sync")
async def sync_build_steps(user: Dict[str, Any] = Depends(operator_user)) -> Dict[str, Any]:
    """Mirror the on-disk manifest into the database for auditability."""
    manifest = _manifest()
    now = db.utc_now()
    written = 0

    for entry in manifest.get("steps", []):
        slug = str(entry.get("slug") or "").strip()
        if not slug:
            continue
        db.execute(
            """INSERT INTO build_steps (slug, ordinal, title, summary, status, doc_file, bundle_file, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(slug) DO UPDATE SET
                 ordinal = excluded.ordinal, title = excluded.title, summary = excluded.summary,
                 status = excluded.status, doc_file = excluded.doc_file, bundle_file = excluded.bundle_file""",
            (
                slug,
                int(entry.get("ordinal") or 0),
                str(entry.get("title") or slug),
                str(entry.get("summary") or ""),
                str(entry.get("status") or "complete"),
                entry.get("doc_file"),
                entry.get("bundle_file"),
                now,
            ),
        )
        written += 1

    db.log_audit(user["email"], "build_steps_sync", {"steps": written})
    return {"synced": written, "generated_at": manifest.get("generated_at")}
