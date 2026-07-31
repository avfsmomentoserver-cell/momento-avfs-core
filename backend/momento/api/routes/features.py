"""Feature-specific API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Dict

from ... import store
from ..deps import source_param

router = APIRouter()


@router.get("/pressure")
async def get_pressure_analysis(
    source: str = Depends(source_param),
    limit: int = Query(default=1000, ge=10, le=10000)
) -> Dict[str, Any]:
    """Get current pressure analysis.
    
    Args:
        source: Data source
        limit: Number of rounds to analyze
        
    Returns:
        Pressure analysis data
    """
    try:
        rounds = store.history(source, limit, ingest_method="file")
        
        if not rounds:
            return {"pressure_percent": 0.0, "error": "No rounds available"}
        
        from features.pressure.detector import CeilingDetector
        from features.pressure.calculator import PressureCalculator
        from features.pressure.metrics import PressureMetrics
        
        detector = CeilingDetector()
        ceilings = detector.detect_resistance_ceilings(rounds)
        
        if not ceilings:
            return {"pressure_percent": 0.0, "error": "No ceilings detected"}
        
        calculator = PressureCalculator()
        pressure_data = calculator.compute_pressure(rounds, ceilings)
        
        metrics = PressureMetrics()
        gauge_output = metrics.format_pressure_gauge(pressure_data)
        
        return gauge_output
        
    except ImportError:
        raise HTTPException(status_code=501, detail="Features not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/baseline")
async def get_baseline_analysis(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=10, le=1000)
) -> Dict[str, Any]:
    """Get equal baseline analysis.
    
    Args:
        source: Data source
        limit: Number of rounds to analyze
        
    Returns:
        Baseline analysis data
    """
    try:
        rounds = store.history(source, limit, ingest_method="file")
        
        if not rounds:
            return {"error": "No rounds available"}
        
        from features.equal_baseline.converter import MultiplierConverter
        from features.equal_baseline.trendlines import TrendlineComputer
        
        multipliers = [r["multiplier"] for r in rounds]
        
        converter = MultiplierConverter()
        baseline_values = converter.convert_multipliers_to_baseline(multipliers)
        
        computer = TrendlineComputer()
        trendlines = computer.compute_trendlines(baseline_values)
        shifts = computer.detect_momentum_shifts(trendlines["momentum"])
        
        return {
            "baseline_values": baseline_values,
            "trendlines": trendlines,
            "momentum_shifts": shifts
        }
        
    except ImportError:
        raise HTTPException(status_code=501, detail="Features not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/moonshot")
async def get_moonshot_prediction(
    source: str = Depends(source_param),
    limit: int = Query(default=100, ge=10, le=1000)
) -> Dict[str, Any]:
    """Get moonshot prediction.
    
    Args:
        source: Data source
        limit: Number of rounds to analyze
        
    Returns:
        Moonshot prediction data
    """
    try:
        rounds = store.history(source, limit, ingest_method="file")
        
        if not rounds:
            return {"imminent": False, "confidence": 0.0, "error": "No rounds available"}
        
        from features.pressure.detector import CeilingDetector
        from features.pressure.calculator import PressureCalculator
        from features.moonshot_scanner.linguistics import MoonshotLinguistics
        from features.moonshot_scanner.scanner import MoonshotScanner
        
        # Get pressure data
        detector = CeilingDetector()
        ceilings = detector.detect_resistance_ceilings(rounds)
        
        pressure_data = {"pressure_percent": 0.0}
        if ceilings:
            calculator = PressureCalculator()
            pressure_data = calculator.compute_pressure(rounds, ceilings)
        
        # Get linguistics
        linguistics = MoonshotLinguistics()
        factors = linguistics.compute_all_linguistics(rounds, pressure_data, ceilings)
        
        # Scan for moonshot
        scanner = MoonshotScanner()
        result = scanner.scan_moonshot_conditions(rounds, factors)
        
        return result
        
    except ImportError:
        raise HTTPException(status_code=501, detail="Features not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bands")
async def get_band_analysis(
    source: str = Depends(source_param),
    limit: int = Query(default=1000, ge=10, le=10000)
) -> Dict[str, Any]:
    """Get enhanced band analysis.
    
    Args:
        source: Data source
        limit: Number of rounds to analyze
        
    Returns:
        Enhanced band analysis data
    """
    try:
        rounds = store.history(source, limit, ingest_method="file")
        
        if not rounds:
            return {"error": "No rounds available"}
        
        from features.band_analysis.ladders import LadderDetector
        from features.band_analysis.relativity import BandRelativity
        
        # Ladder analysis
        ladder_detector = LadderDetector()
        ladder_results = ladder_detector.analyze_all_bands(rounds)
        
        # Band relativity
        relativity = BandRelativity()
        band_relativity = relativity.compute_band_relativity(rounds)
        
        return {
            "ladders": ladder_results,
            "relativity": band_relativity
        }
        
    except ImportError:
        raise HTTPException(status_code=501, detail="Features not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
async def get_all_features(
    source: str = Depends(source_param),
    limit: int = Query(default=1000, ge=10, le=10000)
) -> Dict[str, Any]:
    """Get all feature data.
    
    Args:
        source: Data source
        limit: Number of rounds to analyze
        
    Returns:
        All feature data combined
    """
    try:
        rounds = store.history(source, limit, ingest_method="file")
        
        if not rounds:
            return {"error": "No rounds available"}
        
        # Get analysis payload which includes all features
        from ...analysis import analyze
        from ...config import AnalysisSettings
        
        settings = AnalysisSettings()
        analysis_payload = analyze(rounds, settings)
        
        return analysis_payload.get("advanced_features", {})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
