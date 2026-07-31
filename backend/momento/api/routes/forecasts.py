"""Forecast engine endpoints: predictions, accuracy and calibration."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, Query

from ... import analysis as engine
from ... import db
from ... import forecast as forecast_engine
from ... import store
from ..deps import operator_user, source_param

router = APIRouter()


@router.get("/forecasts")
async def get_forecast(source: str = Depends(source_param)) -> Dict[str, Any]:
    payload = store.analysis_payload(source)
    return {
        "source": source,
        "forecast": payload.get("forecast"),
        "predictions": payload.get("predictions", []),
        "confidence": payload.get("prediction_confidence", {}),
        "accuracy": payload.get("accuracy", {}),
        "state": payload.get("state"),
    }


@router.get("/forecasts/history")
async def forecast_history(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=1, le=500),
) -> Dict[str, Any]:
    rows = db.query(
        """SELECT id, created_at, anchor_round_id, horizon, predicted_state, predicted_band,
                  confidence, range_lo, range_hi, engine, resolved, correct, actual_multiplier, resolved_at
           FROM forecasts WHERE source = ? ORDER BY created_at DESC LIMIT ?""",
        (source, limit),
    )
    return {"source": source, "forecasts": db.rows_to_dicts(rows), "accuracy": forecast_engine.accuracy(source)}


@router.post("/forecasts/record")
async def record_forecast(
    source: str = Depends(source_param),
    user: Dict[str, Any] = Depends(operator_user),
) -> Dict[str, Any]:
    """Snapshot the current forecast so its accuracy gets measured."""
    forecast_id = store.persist_forecast(source)
    db.log_audit(user["email"], "forecast_record", {"source": source, "forecast_id": forecast_id})
    return {
        "recorded": forecast_id is not None,
        "forecast_id": forecast_id,
        "pending": forecast_engine.pending_count(source),
        "source": source,
    }


@router.get("/forecasts/accuracy")
async def accuracy(source: str = Depends(source_param)) -> Dict[str, Any]:
    return {"source": source, **forecast_engine.accuracy(source)}


@router.get("/forecasts/transitions")
async def transitions(
    source: str = Depends(source_param),
    limit: int = Query(default=600, ge=20, le=5000),
) -> Dict[str, Any]:
    settings = store.analysis_settings()
    rounds = store.history(source, limit)
    labels = forecast_engine.state_sequence(rounds, settings)
    return {
        "source": source,
        "transitions": engine.state_transitions(rounds, settings),
        "matrix": forecast_engine.transition_matrix(labels),
        "samples": len(rounds),
    }


@router.get("/calibration/status")
async def calibration_status(source: str = Depends(source_param)) -> Dict[str, Any]:
    acc = forecast_engine.accuracy(source)
    pending = forecast_engine.pending_count(source)
    last = db.query_one(
        "SELECT value, created_at FROM metrics WHERE source = ? AND name = 'calibration_run' ORDER BY created_at DESC LIMIT 1",
        (source,),
    )
    return {
        "source": source,
        "accuracy": acc,
        "pending_forecasts": pending,
        "calibrated": acc["total"] >= 20,
        "last_run": last["created_at"] if last else None,
        "last_score": float(last["value"]) if last else None,
        "settings": store.analysis_settings().as_dict(),
    }


@router.post("/calibration/run")
async def calibration_run(
    source: str = Depends(source_param),
    user: Dict[str, Any] = Depends(operator_user),
) -> Dict[str, Any]:
    """Tune the analysis thresholds against the realised distribution.

    This is a real optimisation pass: the percentile ladder of the observed
    history is used to reset the low/ignition/moonshot thresholds so the state
    machine stays aligned with how this particular source actually behaves.
    """
    settings = store.analysis_settings()
    rounds = store.history(source, settings.max_rounds_buffer)
    multipliers = [float(r["multiplier"]) for r in rounds]

    if len(multipliers) < 40:
        return {
            "calibrated": False,
            "reason": f"Need at least 40 rounds to calibrate (have {len(multipliers)}).",
            "source": source,
            "settings": settings.as_dict(),
        }

    percentiles = engine.robust_percentiles(multipliers)
    before = settings.as_dict()

    proposed = {
        "low_band_threshold": round(max(1.3, min(3.0, percentiles["p50"])), 2),
        "ignition_threshold": round(max(3.0, min(20.0, percentiles["p90"])), 2),
        "moonshot_threshold": round(max(8.0, min(60.0, percentiles["p95"] * 1.4)), 2),
        "mega_moonshot_threshold": round(max(25.0, min(250.0, percentiles["p99"] * 1.8)), 2),
        "volatility_window": int(max(20, min(80, len(multipliers) // 8))),
    }
    updated = store.update_analysis_settings(proposed)

    acc = forecast_engine.accuracy(source)
    store.record_metric(source, "calibration_run", acc["overall"], {"before": before, "after": updated.as_dict()})
    db.log_audit(user["email"], "calibration_run", {"source": source, "proposed": proposed})

    return {
        "calibrated": True,
        "source": source,
        "before": before,
        "after": updated.as_dict(),
        "changed": {k: v for k, v in proposed.items() if before.get(k) != v},
        "percentiles": percentiles,
        "accuracy": acc,
        "samples": len(multipliers),
    }


@router.post("/calibration/backtest")
async def calibration_backtest(
    source: str = Depends(source_param),
    horizon: int = Query(default=1, ge=1, le=10),
    user: Dict[str, Any] = Depends(operator_user),
) -> Dict[str, Any]:
    """Walk-forward backtest of the forecast range against real history."""
    settings = store.analysis_settings()
    rounds = store.history(source, settings.max_rounds_buffer)
    if len(rounds) < 80:
        return {"ran": False, "reason": f"Need at least 80 rounds (have {len(rounds)}).", "source": source}

    multipliers = [float(r["multiplier"]) for r in rounds]
    step = max(1, len(rounds) // 120)
    hits = 0
    tested = 0
    per_state: Dict[str, Dict[str, int]] = {}

    for end in range(60, len(rounds) - horizon, step):
        window = rounds[:end]
        result = forecast_engine.forecast(window, settings)
        actual = multipliers[end + horizon - 1]
        correct = 1 if float(result["range_lo"]) <= actual <= float(result["range_hi"]) else 0
        hits += correct
        tested += 1
        bucket = per_state.setdefault(result["predicted_state"], {"tested": 0, "hits": 0})
        bucket["tested"] += 1
        bucket["hits"] += correct

    for bucket in per_state.values():
        bucket["accuracy"] = round(bucket["hits"] / bucket["tested"], 4) if bucket["tested"] else 0.0

    score = round(hits / tested, 4) if tested else 0.0
    store.record_metric(source, "backtest", score, {"tested": tested, "horizon": horizon})
    db.log_audit(user["email"], "calibration_backtest", {"source": source, "score": score, "tested": tested})

    return {
        "ran": True,
        "source": source,
        "horizon": horizon,
        "tested": tested,
        "hits": hits,
        "accuracy": score,
        "by_state": per_state,
        "samples": len(rounds),
    }


@router.get("/metrics")
async def metrics(
    source: str = Depends(source_param),
    name: str = Query(default="calibration_run"),
    limit: int = Query(default=100, ge=1, le=1000),
) -> Dict[str, Any]:
    return {"source": source, "name": name, "series": store.metric_series(source, name, limit)}
