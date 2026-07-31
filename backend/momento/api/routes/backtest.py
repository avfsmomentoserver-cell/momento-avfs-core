"""Backtesting API endpoints for the Investigation Suite."""

from __future__ import annotations

import logging
import threading
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query

from ... import backtest, db, store
from ..deps import source_param

router = APIRouter()
logger = logging.getLogger("momento.api.backtest")

# Thread-safe backtest execution tracking
_running_backtests: Dict[int, threading.Thread] = {}
_backtest_lock = threading.Lock()


@router.post("/backtest/run")
async def start_backtest(
    source: str = Depends(source_param),
    config: Dict[str, Any] = {},
) -> Dict[str, Any]:
    """Start a new backtest run.

    Config options:
        session_gap: Seconds between sessions (default: from settings)
        window_size: Rounds per backtest window (default: from settings)
        min_session_rounds: Minimum rounds to include a session (default: 10)
        max_rounds: Maximum rounds in a single backtest (default: 10000)
        ingest_method: Filter by ingest method (default: 'file')
        feature_toggles: Dict of toggles to test (optional)
    """
    # Create backtest run record
    run_id = backtest.create_backtest_run(source, config)

    # Mark as running
    with _backtest_lock:
        db.execute(
            """UPDATE backtest_runs SET status = 'running', started_at = ? WHERE id = ?""",
            (db.utc_now(), run_id),
        )

    # Run backtest in background thread
    def run_backtest_thread():
        try:
            results = backtest.run_backtest(source, config)
            backtest.update_backtest_run(run_id, results)
        except Exception as exc:
            logger.exception("Backtest run %d failed", run_id)
            backtest.update_backtest_run(
                run_id,
                {
                    "status": "error",
                    "error": str(exc),
                    "completed_at": db.utc_now(),
                },
            )
        finally:
            with _backtest_lock:
                _running_backtests.pop(run_id, None)

    thread = threading.Thread(target=run_backtest_thread, daemon=True)
    with _backtest_lock:
        _running_backtests[run_id] = thread
    thread.start()

    return {"run_id": run_id, "status": "running", "source": source}


@router.get("/backtest/runs")
async def list_backtest_runs(
    source: str = Depends(source_param),
    limit: int = Query(default=50, ge=1, le=200),
) -> Dict[str, Any]:
    """List backtest runs for a source."""
    runs = backtest.get_backtest_runs(source, limit)
    return {"source": source, "runs": runs, "count": len(runs)}


@router.get("/backtest/run/{run_id}")
async def get_backtest_run(run_id: int) -> Dict[str, Any]:
    """Get a specific backtest run."""
    run = backtest.get_backtest_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Backtest run not found")
    return run


@router.delete("/backtest/run/{run_id}")
async def delete_backtest_run(run_id: int) -> Dict[str, Any]:
    """Delete a backtest run."""
    run = backtest.get_backtest_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Backtest run not found")

    # Cancel if running
    with _backtest_lock:
        if run_id in _running_backtests:
            # Note: Thread cancellation is not possible in Python
            # The thread will complete but results won't be saved
            _running_backtests.pop(run_id, None)

    backtest.delete_backtest_run(run_id)
    return {"deleted": run_id}


@router.get("/backtest/status")
async def backtest_status() -> Dict[str, Any]:
    """Get overall backtest system status."""
    with _backtest_lock:
        running_count = len(_running_backtests)

    return {
        "running_backtests": running_count,
        "status": "available" if running_count < 4 else "busy",
    }


@router.post("/backtest/eta")
async def backtest_eta(
    source: str = Depends(source_param),
    target_ranges: list[float] = Query(default=[12.0, 20.0, 30.0, 50.0]),
) -> Dict[str, Any]:
    """Backtest ETA prediction accuracy for moonshot ranges.
    
    Args:
        source: Data source to backtest
        target_ranges: Target multipliers to test (default: [12, 20, 30, 50])
    """
    settings = store.analysis_settings()
    rounds = store.history(source, settings.max_rounds_buffer, ingest_method="file")
    
    if not rounds:
        raise HTTPException(status_code=400, detail="No rounds found for backtest")
    
    results = backtest.backtest_eta_predictions(rounds, target_ranges)
    return results


@router.post("/backtest/exhaustion")
async def backtest_exhaustion(
    source: str = Depends(source_param),
) -> Dict[str, Any]:
    """Backtest exhaustion signal effectiveness.
    
    Args:
        source: Data source to backtest
    """
    settings = store.analysis_settings()
    rounds = store.history(source, settings.max_rounds_buffer, ingest_method="file")
    
    if not rounds:
        raise HTTPException(status_code=400, detail="No rounds found for backtest")
    
    results = backtest.backtest_exhaustion_signals(rounds)
    return results


@router.post("/backtest/linguistics")
async def backtest_linguistics(
    source: str = Depends(source_param),
    thresholds: Dict[str, float] = None,
) -> Dict[str, Any]:
    """Backtest different linguistic factor combinations.
    
    Args:
        source: Data source to backtest
        thresholds: Custom thresholds for release conditions
    """
    settings = store.analysis_settings()
    rounds = store.history(source, settings.max_rounds_buffer, ingest_method="file")
    
    if not rounds:
        raise HTTPException(status_code=400, detail="No rounds found for backtest")
    
    results = backtest.backtest_combined_linguistics(rounds, thresholds)
    return results


@router.post("/backtest/optimize")
async def optimize_backtest_thresholds(
    source: str = Depends(source_param),
    metric: str = Query(default="f1", regex="^(f1|precision|recall)$"),
    search_space: Dict[str, list[float]] = None,
) -> Dict[str, Any]:
    """Grid search to find optimal thresholds for moonshot prediction.
    
    Args:
        source: Data source to backtest
        metric: Metric to optimize (f1, precision, recall)
        search_space: Custom search space for thresholds
    """
    settings = store.analysis_settings()
    rounds = store.history(source, settings.max_rounds_buffer, ingest_method="file")
    
    if not rounds:
        raise HTTPException(status_code=400, detail="No rounds found for backtest")
    
    results = backtest.optimize_thresholds(rounds, metric, search_space)
    return results
