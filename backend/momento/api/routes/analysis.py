"""Analysis, signals, linguistics, DNA, house edge and ML endpoints."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, Query

from ... import analysis as engine
from ... import forecast as forecast_engine
from ... import linguistics as ling
from ... import plugins, store
from ..deps import source_param

router = APIRouter()


@router.get("/analysis")
async def full_analysis(
    source: str = Depends(source_param),
    limit: int = Query(default=600, ge=10, le=5000),
    ingest_method: str = Query(default=None),
) -> Dict[str, Any]:
    """The complete payload the Command Center renders."""
    return store.analysis_payload(source, limit=limit, ingest_method=ingest_method)


@router.get("/analysis/signals")
async def signals(source: str = Depends(source_param)) -> Dict[str, Any]:
    payload = store.analysis_payload(source)
    return {
        "source": source,
        "state": payload.get("state"),
        "state_scores": payload.get("state_scores", {}),
        "signals": payload.get("signals", {}),
        "streaks": payload.get("streaks", {}),
        "warnings": payload.get("warnings", []),
        "narrative": payload.get("narrative"),
    }


@router.get("/analysis/distribution")
async def distribution(source: str = Depends(source_param)) -> Dict[str, Any]:
    payload = store.analysis_payload(source)
    return {
        "source": source,
        "distribution": payload.get("distribution", {}),
        "band_histogram": payload.get("band_histogram", []),
        "percentiles": payload.get("percentiles", {}),
        "band_exhaustion": payload.get("band_exhaustion", {}),
    }


@router.get("/analysis/streaks")
async def streaks(source: str = Depends(source_param)) -> Dict[str, Any]:
    payload = store.analysis_payload(source)
    return {"source": source, "streaks": payload.get("streaks", {}), "regime": payload.get("regime", {})}


@router.get("/analysis/resistance")
async def resistance(
    source: str = Depends(source_param),
    ingest_method: str = Query(default=None),
) -> Dict[str, Any]:
    settings = store.analysis_settings()
    rounds = store.history(source, settings.max_rounds_buffer, ingest_method=ingest_method)
    multipliers = [float(r["multiplier"]) for r in rounds]
    return {
        "source": source,
        "resistance": engine.resistance_levels(multipliers, settings),
        "collapse_ladder": engine.collapse_ladder(multipliers, settings),
        "ascending_ladder": engine.ascending_ladder(multipliers, settings),
        "nested": engine.nested_bands(multipliers, settings),
        "shelf": engine.shelf_signal(multipliers, settings),
    }


@router.get("/analysis/ceiling")
async def ceiling_analyzer(
    source: str = Depends(source_param),
    ingest_method: str = Query(default=None),
) -> Dict[str, Any]:
    """Collapse & ceiling analyzer output."""
    settings = store.analysis_settings()
    rounds = store.history(source, 600, ingest_method=ingest_method)
    multipliers = [float(r["multiplier"]) for r in rounds]
    result = plugins.collapse_ceiling_analyzer(multipliers, settings, {"weight": 1.0, "threshold": 0.45})
    return {"source": source, "analyzer": "collapse_ceiling", **result}


@router.get("/analysis/gap-swing")
async def gap_swing_analyzer(
    source: str = Depends(source_param),
    ingest_method: str = Query(default=None),
) -> Dict[str, Any]:
    """Gap & swing analyzer output."""
    settings = store.analysis_settings()
    rounds = store.history(source, 600, ingest_method=ingest_method)
    multipliers = [float(r["multiplier"]) for r in rounds]
    result = plugins.gap_swing_analyzer(multipliers, settings, {"weight": 1.0, "threshold": 0.4})
    return {"source": source, "analyzer": "gap_swing", "detail_series": engine.gap_swing(multipliers), **result}


@router.get("/analysis/dna")
async def dna(
    source: str = Depends(source_param),
    tolerance: float = Query(default=0.0, ge=0.0, le=1.0),
    window: int = Query(default=0, ge=0, le=32),
    ingest_method: str = Query(default=None),
) -> Dict[str, Any]:
    """DNA signature matching with optional overrides."""
    settings = store.analysis_settings()
    if tolerance > 0:
        settings = settings.merge({"dna_tolerance": tolerance})
    if window > 0:
        settings = settings.merge({"dna_window": window})

    rounds = store.history(source, settings.max_rounds_buffer, ingest_method=ingest_method)
    multipliers = [float(r["multiplier"]) for r in rounds]
    return {
        "source": source,
        "report": engine.dna_report(multipliers, settings),
        "settings": {"tolerance": settings.dna_tolerance, "window": settings.dna_window},
        "samples": len(multipliers),
    }


@router.get("/analysis/house-edge")
async def house_edge(
    source: str = Depends(source_param),
    ingest_method: str = Query(default=None),
) -> Dict[str, Any]:
    settings = store.analysis_settings()
    rounds = store.history(source, settings.max_rounds_buffer, ingest_method=ingest_method)
    multipliers = [float(r["multiplier"]) for r in rounds]
    return {"source": source, **engine.house_edge(multipliers, settings)}


@router.get("/analysis/moonshot")
async def moonshot(
    source: str = Depends(source_param),
    ingest_method: str = Query(default=None),
) -> Dict[str, Any]:
    settings = store.analysis_settings()
    rounds = store.history(source, settings.max_rounds_buffer, ingest_method=ingest_method)
    multipliers = [float(r["multiplier"]) for r in rounds]
    return {
        "source": source,
        "eta": engine.moonshot_eta(rounds, settings),
        "mega_scores": engine.mega_moonshot_scores(rounds, settings),
        "band_exhaustion": engine.band_exhaustion(multipliers, settings),
        "dna": engine.dna_report(multipliers, settings),
    }


@router.get("/analysis/ml")
async def ml(
    source: str = Depends(source_param),
    ingest_method: str = Query(default=None),
) -> Dict[str, Any]:
    settings = store.analysis_settings()
    rounds = store.history(source, settings.max_rounds_buffer, ingest_method=ingest_method)
    multipliers = [float(r["multiplier"]) for r in rounds]
    return {"source": source, **forecast_engine.ml_predictions(multipliers, settings)}


@router.get("/analysis/plugins")
async def run_plugins(
    source: str = Depends(source_param),
    ingest_method: str = Query(default=None),
) -> Dict[str, Any]:
    """Execute every enabled analyzer against the live window."""
    settings = store.analysis_settings()
    rounds = store.history(source, 600, ingest_method=ingest_method)
    multipliers = [float(r["multiplier"]) for r in rounds]
    results = plugins.run_all(source, multipliers, settings)
    return {"source": source, "results": results, "count": len(results)}


@router.get("/linguistics")
async def linguistics(source: str = Depends(source_param)) -> Dict[str, Any]:
    """The semantic layer: vocabulary + the current reading."""
    payload = store.analysis_payload(source)
    rounds = store.history(source, 60)
    window = [float(r["multiplier"]) for r in rounds]
    return {
        "source": source,
        "bands": [
            {**band, "hi": None if band["hi"] == float("inf") else band["hi"]}
            for band in ling.BANDS
        ],
        "states": [{"state": state, **ling.STATE_META[state]} for state in ling.STATES],
        "current": {
            "state": payload.get("state"),
            "narrative": payload.get("narrative"),
            "shape": payload.get("shape"),
            "latest": payload.get("latest", {}),
        },
        "tokens": [ling.tokenize(m).as_dict() for m in window[-24:]],
    }


@router.get("/linguistics/explain")
async def explain(multiplier: float = Query(ge=1.0, le=1_000_000)) -> Dict[str, Any]:
    """Walk one multiplier through every linguistic layer."""
    return {
        "multiplier": multiplier,
        "token": ling.tokenize(multiplier).as_dict(),
        "layers": ling.reverse_layers(multiplier),
        "next_band": ling.nearest_band_above(multiplier),
    }
