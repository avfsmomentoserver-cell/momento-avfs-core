"""Round history, latest rounds, sessions and CSV export."""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse

from ... import db, store
from ..deps import optional_user, operator_user, source_param

router = APIRouter()


@router.get("/rounds")
async def get_rounds(
    source: str = Depends(source_param),
    limit: int = Query(default=200, ge=1, le=10000),
    offset: int = Query(default=0, ge=0),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    ingest_method: str = Query(default=None),
) -> Dict[str, Any]:
    return store.get_rounds(source, limit=limit, offset=offset, order=order, ingest_method=ingest_method)


@router.get("/rounds/latest")
async def latest(
    source: str = Depends(source_param),
    n: int = Query(default=20, ge=1, le=1000),
) -> Dict[str, Any]:
    data = store.get_rounds(source, limit=n, order="desc")
    return {"rounds": data["rounds"], "count": len(data["rounds"]), "total": data["total"], "source": source}


@router.get("/rounds/all")
async def get_all_rounds(
    source: str = Depends(source_param),
    ingest_method: str = Query(default=None),
) -> Dict[str, Any]:
    """Get all rounds without limit for pagination in Eagle Eye."""
    return store.get_rounds(source, limit=100000, offset=0, order="desc", ingest_method=ingest_method)


@router.get("/rounds/export")
async def export(
    source: str = Depends(source_param),
    limit: int = Query(default=5000, ge=1, le=50000),
) -> PlainTextResponse:
    csv_text = store.export_csv(source, limit)
    return PlainTextResponse(
        csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="momento_{source}_rounds.csv"'},
    )


@router.get("/rounds/{round_id}")
async def get_round(round_id: int) -> Dict[str, Any]:
    row = db.query_one(
        "SELECT id, source, timestamp, multiplier, color, band, points, ingest_method, source_file, created_at FROM rounds WHERE id = ?",
        (round_id,),
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Round not found")
    return dict(row)


@router.get("/sessions")
async def sessions(
    source: str = Depends(source_param),
    limit: int = Query(default=60, ge=1, le=500),
) -> Dict[str, Any]:
    return {"sessions": store.list_sessions(source, limit), "source": source}


@router.post("/sessions/rebuild")
async def rebuild_sessions(
    source: str = Depends(source_param),
    use_full_history: bool = Query(default=False),
    use_mega_gap: bool = Query(default=False),
    user: Optional[Dict[str, Any]] = Depends(optional_user),
) -> Dict[str, Any]:
    """Rebuild session index from raw round history.

    Args:
        use_full_history: If True, load all rounds from DB for continuous sessions (no limit)
        use_mega_gap: If True, use 48-hour gap for mega pressure tracker instead of 5-minute gap
    """
    written = store.rebuild_sessions(source, use_full_history=use_full_history, use_mega_gap=use_mega_gap)
    if user:
        db.log_audit(user["email"], "sessions_rebuild", {"source": source, "sessions": written, "full_history": use_full_history, "mega_gap": use_mega_gap})
    return {"sessions_written": written, "sessions": store.list_sessions(source, 60), "source": source, "full_history": use_full_history, "mega_gap": use_mega_gap}


@router.get("/statistics")
async def statistics(source: str = Depends(source_param)) -> Dict[str, Any]:
    """Aggregate counters for the source overview cards."""
    payload = store.analysis_payload(source)
    data = store.get_rounds(source, limit=1)
    return {
        "source": source,
        "total_rounds": data["total"],
        "session": payload.get("session", {}),
        "distribution": payload.get("distribution", {}),
        "percentiles": payload.get("percentiles", {}),
        "house_edge": payload.get("house_edge", {}),
        "regime": payload.get("regime", {}),
        "latest": payload.get("latest", {}),
    }


@router.get("/top-rounds")
async def get_top_rounds(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=1, le=1000),
    session_id: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    """Get top rounds with optional session filtering."""
    return store.get_top_rounds(source, limit=limit, session_id=session_id)


@router.get("/top-rounds/latest-session")
async def get_latest_session_top_rounds(
    source: str = Depends(source_param),
) -> Dict[str, Any]:
    """Get the most recent session's top rounds."""
    result = store.get_latest_session_top_rounds(source)
    if result is None:
        return {"top_rounds": [], "count": 0, "source": source, "session_id": None}
    return result


@router.get("/top-rounds/day/{day_date}")
async def get_top_rounds_by_day(
    day_date: str,
    source: str = Depends(source_param),
) -> Dict[str, Any]:
    """Get top rounds for a specific day with hourly intervals."""
    return store.get_top_rounds_by_day(source, day_date)


@router.post("/top-rounds/ingest")
async def ingest_top_rounds(
    payload: Dict[str, Any],
    source: str = Depends(source_param),
    user: Dict[str, Any] = Depends(operator_user),
) -> Dict[str, Any]:
    """Ingest top rounds from collector payload."""
    result = store.ingest_top_rounds_payload(payload, source)
    db.log_audit(user["email"], "top_rounds_ingest", {"source": source, "imported": result["imported"]})
    return result
