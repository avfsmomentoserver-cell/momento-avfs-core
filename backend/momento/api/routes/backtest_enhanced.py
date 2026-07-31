"""Enhanced backtest API endpoints."""

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from typing import Any, Dict, Optional

from ... import backtest, config, store
from ..deps import source_param

router = APIRouter()


@router.post("/phased")
async def run_phased_backtest(
    source: str = Depends(source_param),
    warmup_pct: float = Query(default=0.1, ge=0.0, le=0.5),
    stress_pct: float = Query(default=0.3, ge=0.0, le=0.5),
    max_rounds: int = Query(default=10000, ge=100, le=100000)
) -> Dict[str, Any]:
    """Run phased backtest with warmup, normal, and stress phases.
    
    Args:
        source: Data source
        warmup_pct: Percentage for warmup phase
        stress_pct: Percentage for stress phase
        max_rounds: Maximum rounds to test
        
    Returns:
        Phased backtest results
    """
    try:
        rounds = store.history(source, max_rounds, ingest_method="file")
        
        if not rounds:
            raise HTTPException(status_code=400, detail="No rounds available")
        
        # Split into phases
        phases = backtest.split_test_phases(rounds, warmup_pct, stress_pct)
        
        # Run backtest on each phase
        results = {}
        for phase_name, phase_rounds in phases.items():
            if phase_rounds:
                result = backtest.run_backtest(source, {"session_gap": 300})
                results[phase_name] = result
        
        return {
            "phases": results,
            "warmup_pct": warmup_pct,
            "stress_pct": stress_pct,
            "total_rounds": len(rounds)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ab-test")
async def run_ab_test(
    source: str = Depends(source_param),
    feature_name: str = Query(..., description="Feature to test"),
    config_a: Dict[str, Any] = Body(..., description="Configuration A"),
    config_b: Dict[str, Any] = Body(..., description="Configuration B"),
    max_rounds: int = Query(default=10000, ge=100, le=100000)
) -> Dict[str, Any]:
    """Run A/B test between two configurations.
    
    Args:
        source: Data source
        feature_name: Feature to test
        config_a: First configuration
        config_b: Second configuration
        max_rounds: Maximum rounds to test
        
    Returns:
        A/B test results
    """
    try:
        rounds = store.history(source, max_rounds, ingest_method="file")
        
        if not rounds:
            raise HTTPException(status_code=400, detail="No rounds available")
        
        result = backtest.ab_test_feature(
            rounds,
            feature_name,
            config_a,
            config_b
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/{run_id}")
async def get_backtest_metrics(
    run_id: int,
    source: str = Depends(source_param)
) -> Dict[str, Any]:
    """Get detailed metrics for a backtest run.
    
    Args:
        run_id: Backtest run ID
        source: Data source
        
    Returns:
        Detailed backtest metrics
    """
    try:
        result = backtest.get_backtest_run(run_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Backtest run not found")
        
        # Compute advanced metrics if results available
        if result.get("results") and result["results"].get("baseline"):
            predictions = result["results"]["baseline"].get("predictions", [])
            # Would need actuals for full metrics computation
            # For now, return stored results
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize")
async def optimize_backtest_config(
    source: str = Depends(source_param),
    objective: str = Query(default="maximize_accuracy"),
    constraints: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Get AI-assisted backtest configuration suggestions.
    
    Args:
        source: Data source
        objective: Optimization objective
        constraints: Optional constraints
        
    Returns:
        Suggested configuration
    """
    try:
        # Get historical backtest results
        historical_results = backtest.get_backtest_runs(source, limit=50)
        
        if not historical_results:
            return {
                "suggested_config": {
                    "session_gap": 300,
                    "window_size": 5000
                },
                "confidence": 0.0,
                "reason": "No historical data available"
            }
        
        from features.ai.optimizer import BacktestOptimizer
        
        optimizer = BacktestOptimizer()
        for result in historical_results:
            optimizer.add_result(result)
        
        config = optimizer.suggest_backtest_config(
            historical_results,
            objective,
            constraints or {}
        )
        
        return config
        
    except ImportError:
        raise HTTPException(status_code=501, detail="AI features not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare")
async def compare_backtest_runs(
    source: str = Depends(source_param),
    run_ids: str = Query(..., description="Comma-separated run IDs to compare")
) -> Dict[str, Any]:
    """Compare multiple backtest runs.
    
    Args:
        source: Data source
        run_ids: Comma-separated run IDs
        
    Returns:
        Comparison results
    """
    try:
        run_id_list = [int(id.strip()) for id in run_ids.split(",")]
        
        results = []
        for run_id in run_id_list:
            result = backtest.get_backtest_run(run_id)
            if result:
                results.append(result)
        
        if not results:
            raise HTTPException(status_code=404, detail="No valid backtest runs found")
        
        # Compute comparison metrics
        accuracies = [r.get("baseline_accuracy", 0.0) for r in results]
        avg_accuracy = sum(accuracies) / len(accuracies)
        best_run = max(results, key=lambda r: r.get("baseline_accuracy", 0.0))
        worst_run = min(results, key=lambda r: r.get("baseline_accuracy", 0.0))
        
        return {
            "runs": results,
            "comparison": {
                "average_accuracy": avg_accuracy,
                "best_run_id": best_run["id"],
                "best_accuracy": best_run.get("baseline_accuracy", 0.0),
                "worst_run_id": worst_run["id"],
                "worst_accuracy": worst_run.get("baseline_accuracy", 0.0),
                "accuracy_range": max(accuracies) - min(accuracies)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
