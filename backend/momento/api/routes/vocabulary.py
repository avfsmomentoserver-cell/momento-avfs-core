"""Vocabulary learning system API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Dict, List
from ... import pattern_discovery, vocabulary_processor as vp
from ..deps import operator_user

router = APIRouter()

@router.get("/vocabulary")
async def list_vocabulary() -> Dict[str, Any]:
    """List all vocabulary entries."""
    return vp.processor.get_vocabulary_state()

@router.get("/vocabulary/{vocabulary_id}")
async def get_vocabulary(vocabulary_id: str) -> Dict[str, Any]:
    """Get specific vocabulary entry."""
    from ... import db
    
    row = db.query_one(
        "SELECT * FROM vocabulary_entries WHERE id = ?",
        (vocabulary_id,)
    )
    
    if not row:
        raise HTTPException(status_code=404, detail="Vocabulary entry not found")
    
    return dict(row)

@router.post("/vocabulary")
async def create_vocabulary(
    pattern: Dict[str, Any],
    user: Dict[str, Any] = Depends(operator_user)
) -> Dict[str, Any]:
    """Manually create vocabulary entry."""
    try:
        pattern_id = vp.processor.register_pattern(pattern)
        
        # Log audit
        from ... import db
        db.log_audit(user["email"], "vocabulary_create", {"vocabulary_id": pattern_id})
        
        return {"vocabulary_id": pattern_id, "status": "candidate"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/vocabulary/{vocabulary_id}/formalize")
async def formalize_vocabulary(
    vocabulary_id: str,
    user: Dict[str, Any] = Depends(operator_user)
) -> Dict[str, Any]:
    """Promote candidate vocabulary to formalized."""
    from ... import db
    
    # Check if exists
    row = db.query_one("SELECT * FROM vocabulary_entries WHERE id = ?", (vocabulary_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Vocabulary entry not found")
    
    # Update status
    db.execute(
        "UPDATE vocabulary_entries SET status = 'formalized', formalized_at = ? WHERE id = ?",
        (db.utc_now(), vocabulary_id)
    )
    
    # Reload vocabulary processor cache
    vp.processor._load_formalized_vocabulary()
    
    # Log audit
    db.log_audit(user["email"], "vocabulary_formalize", {"vocabulary_id": vocabulary_id})
    
    return {"vocabulary_id": vocabulary_id, "status": "formalized"}

@router.get("/vocabulary/learning/status")
async def learning_status() -> Dict[str, Any]:
    """Get learning system status."""
    from ... import db
    
    # Count candidates
    candidates = db.query_one(
        "SELECT COUNT(*) as c FROM vocabulary_entries WHERE status = 'candidate'"
    )
    
    # Count formalized
    formalized = db.query_one(
        "SELECT COUNT(*) as c FROM vocabulary_entries WHERE status = 'formalized'"
    )
    
    return {
        "candidates": candidates["c"] if candidates else 0,
        "formalized": formalized["c"] if formalized else 0,
        "total": (candidates["c"] if candidates else 0) + (formalized["c"] if formalized else 0)
    }

@router.post("/vocabulary/discover")
async def trigger_discovery(source: str = "aviator", discovery_sources: str = "all") -> Dict[str, Any]:
    """Trigger pattern discovery from specified source."""
    from ... import pattern_discovery
    
    sources = None if discovery_sources == "all" else discovery_sources.split(",")
    
    result = pattern_discovery.coordinator.trigger_discovery_cycle(source)
    
    if discovery_sources != "all":
        result["sources_requested"] = sources
    
    return result

@router.get("/vocabulary/discoveries")
async def list_discoveries(limit: int = 50) -> Dict[str, Any]:
    """List pattern discoveries."""
    from ... import db
    
    rows = db.query(
        """SELECT id, discovery_source, vocabulary_id, status, created_at, processed_at
           FROM pattern_discoveries
           ORDER BY created_at DESC LIMIT ?""",
        (limit,)
    )
    
    return {
        "discoveries": [dict(row) for row in rows],
        "count": len(rows)
    }

@router.get("/vocabulary/learning/progress")
async def learning_progress() -> Dict[str, Any]:
    """Get learning system progress."""
    from ... import vocabulary_learning
    return vocabulary_learning.learning_engine.get_learning_progress()

@router.post("/vocabulary/{vocabulary_id}/evaluate")
async def evaluate_vocabulary(vocabulary_id: str) -> Dict[str, Any]:
    """Evaluate a vocabulary candidate for formalization."""
    from ... import vocabulary_learning
    return vocabulary_learning.learning_engine.evaluate_candidate(vocabulary_id)

@router.post("/vocabulary/{vocabulary_id}/formalize")
async def formalize_vocabulary_endpoint(
    vocabulary_id: str,
    user: Dict[str, Any] = Depends(operator_user)
) -> Dict[str, Any]:
    """Formalize a vocabulary candidate."""
    from ... import vocabulary_learning
    return vocabulary_learning.learning_engine.formalize_candidate(vocabulary_id, user["email"])

@router.post("/vocabulary/{vocabulary_id}/deprecate")
async def deprecate_vocabulary_endpoint(
    vocabulary_id: str,
    user: Dict[str, Any] = Depends(operator_user)
) -> Dict[str, Any]:
    """Deprecate a vocabulary entry."""
    from ... import vocabulary_learning
    return vocabulary_learning.learning_engine.deprecate_vocabulary(vocabulary_id, user["email"])

@router.post("/vocabulary/learning/auto-formalize")
async def auto_formalize(
    user: Dict[str, Any] = Depends(operator_user)
) -> Dict[str, Any]:
    """Automatically formalize all ready candidates."""
    from ... import vocabulary_learning
    return vocabulary_learning.learning_engine.auto_formalize_ready_candidates(user["email"])

@router.get("/vocabulary/{vocabulary_id}/usage")
async def get_vocabulary_usage(vocabulary_id: str, limit: int = 100) -> Dict[str, Any]:
    """Get usage history for a vocabulary entry."""
    from ... import vocabulary_usage
    history = vocabulary_usage.usage_tracker.get_usage_history(vocabulary_id, limit)
    stats = vocabulary_usage.usage_tracker.get_usage_statistics(vocabulary_id)
    return {
        "vocabulary_id": vocabulary_id,
        "statistics": stats,
        "history": history
    }

@router.post("/vocabulary/features/import")
async def import_vocabulary_features(
    user: Dict[str, Any] = Depends(operator_user)
) -> Dict[str, Any]:
    """Import all formalized vocabulary as features."""
    from ... import vocabulary_auto_import
    result = vocabulary_auto_import.auto_import.import_formalized_vocabulary()
    
    # Log audit
    db.log_audit(user["email"], "vocabulary_feature_import", result)
    
    return result

@router.post("/vocabulary/{vocabulary_id}/import-feature")
async def import_single_feature(
    vocabulary_id: str,
    user: Dict[str, Any] = Depends(operator_user)
) -> Dict[str, Any]:
    """Import a single vocabulary as feature."""
    from ... import vocabulary_auto_import
    result = vocabulary_auto_import.auto_import.import_single_vocabulary(vocabulary_id)
    
    # Log audit
    db.log_audit(user["email"], "vocabulary_single_import", {"vocabulary_id": vocabulary_id})
    
    return result

@router.delete("/vocabulary/{vocabulary_id}/feature")
async def remove_vocabulary_feature(
    vocabulary_id: str,
    user: Dict[str, Any] = Depends(operator_user)
) -> Dict[str, Any]:
    """Remove vocabulary feature from registry."""
    from ... import vocabulary_auto_import
    result = vocabulary_auto_import.auto_import.remove_vocabulary_feature(vocabulary_id)
    
    # Log audit
    db.log_audit(user["email"], "vocabulary_feature_remove", {"vocabulary_id": vocabulary_id})
    
    return result

@router.get("/vocabulary/features/mapping")
async def get_feature_mapping() -> Dict[str, Any]:
    """Get vocabulary to feature mapping."""
    from ... import vocabulary_auto_import
    return vocabulary_auto_import.auto_import.get_feature_mapping()
