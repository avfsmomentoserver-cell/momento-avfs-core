"""Vocabulary learning engine with child-like formalization."""

import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone, timedelta
from . import db, vocabulary_usage as vu

logger = logging.getLogger("momento.vocabulary_learning")

class VocabularyLearningEngine:
    """Child-like learning system for vocabulary formalization."""
    
    # Learning thresholds (configurable)
    MIN_USAGE_THRESHOLD = 10  # Minimum occurrences before formalization
    CONSISTENCY_THRESHOLD = 0.8  # 80% consistency required
    TIME_WINDOW_DAYS = 7  # Usage must occur within time window
    MIN_CONFIDENCE = 0.7  # Minimum average confidence
    
    def __init__(self):
        self.learning_enabled = True
    
    def evaluate_candidate(self, vocabulary_id: str) -> Dict[str, Any]:
        """Evaluate if candidate should be formalized."""
        # Get vocabulary entry
        vocab_row = db.query_one(
            "SELECT * FROM vocabulary_entries WHERE id = ?",
            (vocabulary_id,)
        )
        
        if not vocab_row:
            return {"ready": False, "reason": "Vocabulary entry not found"}
        
        if vocab_row["status"] != "candidate":
            return {"ready": False, "reason": f"Entry is {vocab_row['status']}, not candidate"}
        
        # Get usage statistics
        usage_stats = vu.usage_tracker.get_usage_statistics(vocabulary_id)
        
        # Check usage count
        usage_count = usage_stats["total_usage"]
        if usage_count < self.MIN_USAGE_THRESHOLD:
            return {
                "ready": False,
                "usage_count": usage_count,
                "required": self.MIN_USAGE_THRESHOLD,
                "reason": f"Insufficient usage ({usage_count}/{self.MIN_USAGE_THRESHOLD})"
            }
        
        # Check consistency
        consistency = self._calculate_consistency(vocabulary_id)
        if consistency < self.CONSISTENCY_THRESHOLD:
            return {
                "ready": False,
                "consistency": round(consistency, 4),
                "required": self.CONSISTENCY_THRESHOLD,
                "reason": f"Low consistency ({consistency:.1%}/{self.CONSISTENCY_THRESHOLD:.1%})"
            }
        
        # Check time window
        in_time_window = self._check_time_window(vocabulary_id)
        if not in_time_window:
            return {
                "ready": False,
                "in_time_window": False,
                "reason": "Usage outside time window"
            }
        
        # Check confidence
        avg_confidence = usage_stats["avg_confidence"]
        if avg_confidence < self.MIN_CONFIDENCE:
            return {
                "ready": False,
                "avg_confidence": avg_confidence,
                "required": self.MIN_CONFIDENCE,
                "reason": f"Low confidence ({avg_confidence:.1%}/{self.MIN_CONFIDENCE:.1%})"
            }
        
        # Check semantic consistency
        semantic_valid = self._check_semantic_consistency(vocabulary_id)
        if not semantic_valid:
            return {
                "ready": False,
                "semantic_valid": False,
                "reason": "Semantic inconsistency detected"
            }
        
        # All checks passed
        return {
            "ready": True,
            "usage_count": usage_count,
            "consistency": round(consistency, 4),
            "avg_confidence": avg_confidence,
            "in_time_window": in_time_window,
            "semantic_valid": semantic_valid,
            "reason": "Candidate meets all formalization criteria"
        }
    
    def _calculate_consistency(self, vocabulary_id: str) -> float:
        """Calculate consistency of vocabulary usage."""
        rows = db.query(
            "SELECT confidence FROM vocabulary_usage WHERE vocabulary_id = ? AND confidence IS NOT NULL",
            (vocabulary_id,)
        )
        
        if not rows or len(rows) < 2:
            return 1.0
        
        confidences = [float(r["confidence"]) for r in rows]
        
        # Calculate standard deviation
        import statistics
        if len(confidences) < 2:
            return 1.0
        
        mean_conf = statistics.mean(confidences)
        stdev = statistics.pstdev(confidences)
        
        # Consistency = 1 - (normalized stdev)
        if mean_conf > 0:
            consistency = 1.0 - min(stdev / mean_conf, 1.0)
        else:
            consistency = 1.0 - min(stdev, 1.0)
        
        return max(0.0, min(1.0, consistency))
    
    def _check_time_window(self, vocabulary_id: str) -> bool:
        """Check if usage occurred within time window."""
        rows = db.query(
            """SELECT MIN(created_at) as first_usage, MAX(created_at) as last_usage
               FROM vocabulary_usage WHERE vocabulary_id = ?""",
            (vocabulary_id,)
        )
        
        if not rows or not rows[0]["first_usage"]:
            return False
        
        first_usage = datetime.fromisoformat(rows[0]["first_usage"].replace("Z", "+00:00"))
        last_usage = datetime.fromisoformat(rows[0]["last_usage"].replace("Z", "+00:00"))
        
        time_diff = (last_usage - first_usage).days
        return time_diff <= self.TIME_WINDOW_DAYS
    
    def _check_semantic_consistency(self, vocabulary_id: str) -> bool:
        """Check for semantic contradictions with existing vocabulary."""
        # Get vocabulary entry
        vocab_row = db.query_one(
            "SELECT type, name, mathematical_definition FROM vocabulary_entries WHERE id = ?",
            (vocabulary_id,)
        )
        
        if not vocab_row:
            return False
        
        # Check for duplicate names
        duplicate = db.query_one(
            "SELECT id FROM vocabulary_entries WHERE name = ? AND id != ?",
            (vocab_row["name"], vocabulary_id)
        )
        
        if duplicate:
            logger.warning(f"Semantic inconsistency: duplicate name {vocab_row['name']}")
            return False
        
        # Check for overlapping multiplier ranges
        definition = json.loads(vocab_row["mathematical_definition"])
        if "multiplier_range" in definition:
            lo, hi = definition["multiplier_range"]
            
            # Check for overlapping ranges in same type
            overlaps = db.query(
                """SELECT id, name FROM vocabulary_entries 
                   WHERE type = ? AND id != ? AND status = 'formalized'""",
                (vocab_row["type"], vocabulary_id)
            )
            
            for overlap in overlaps:
                overlap_def = json.loads(overlap["mathematical_definition"])
                if "multiplier_range" in overlap_def:
                    overlap_lo, overlap_hi = overlap_def["multiplier_range"]
                    # Check for overlap
                    if not (hi <= overlap_lo or lo >= overlap_hi):
                        logger.warning(f"Semantic inconsistency: overlapping range with {overlap['name']}")
                        return False
        
        return True
    
    def formalize_candidate(self, vocabulary_id: str, actor: str = "system") -> Dict[str, Any]:
        """Promote candidate to formalized vocabulary."""
        # Evaluate first
        evaluation = self.evaluate_candidate(vocabulary_id)
        
        if not evaluation["ready"]:
            return {
                "success": False,
                "reason": evaluation["reason"],
                "evaluation": evaluation
            }
        
        try:
            # Update status
            db.execute(
                "UPDATE vocabulary_entries SET status = 'formalized', formalized_at = ? WHERE id = ?",
                (db.utc_now(), vocabulary_id)
            )
            
            # Reload vocabulary processor cache
            from . import vocabulary_processor as vp
            vp.processor._load_formalized_vocabulary()
            
            # Log audit
            db.log_audit(actor, "vocabulary_formalize", {"vocabulary_id": vocabulary_id})
            
            logger.info(f"Formalized vocabulary: {vocabulary_id}")
            
            return {
                "success": True,
                "vocabulary_id": vocabulary_id,
                "status": "formalized",
                "evaluation": evaluation
            }
        except Exception as e:
            logger.error(f"Failed to formalize {vocabulary_id}: {e}")
            return {
                "success": False,
                "reason": str(e),
                "evaluation": evaluation
            }
    
    def deprecate_vocabulary(self, vocabulary_id: str, actor: str = "system") -> Dict[str, Any]:
        """Deprecate a vocabulary entry."""
        try:
            # Update status
            db.execute(
                "UPDATE vocabulary_entries SET status = 'deprecated', deprecated_at = ? WHERE id = ?",
                (db.utc_now(), vocabulary_id)
            )
            
            # Reload vocabulary processor cache
            from . import vocabulary_processor as vp
            vp.processor._load_formalized_vocabulary()
            
            # Log audit
            db.log_audit(actor, "vocabulary_deprecate", {"vocabulary_id": vocabulary_id})
            
            logger.info(f"Deprecated vocabulary: {vocabulary_id}")
            
            return {
                "success": True,
                "vocabulary_id": vocabulary_id,
                "status": "deprecated"
            }
        except Exception as e:
            logger.error(f"Failed to deprecate {vocabulary_id}: {e}")
            return {
                "success": False,
                "reason": str(e)
            }
    
    def get_learning_progress(self) -> Dict[str, Any]:
        """Get overall learning system progress."""
        # Count by status
        candidates = db.query_one(
            "SELECT COUNT(*) as c FROM vocabulary_entries WHERE status = 'candidate'"
        )
        formalized = db.query_one(
            "SELECT COUNT(*) as c FROM vocabulary_entries WHERE status = 'formalized'"
        )
        deprecated = db.query_one(
            "SELECT COUNT(*) as c FROM vocabulary_entries WHERE status = 'deprecated'"
        )
        
        # Get ready candidates
        ready_candidates = []
        if candidates and candidates["c"] > 0:
            all_candidates = db.query("SELECT id FROM vocabulary_entries WHERE status = 'candidate'")
            for row in all_candidates:
                evaluation = self.evaluate_candidate(row["id"])
                if evaluation["ready"]:
                    ready_candidates.append({
                        "vocabulary_id": row["id"],
                        "evaluation": evaluation
                    })
        
        return {
            "candidates": candidates["c"] if candidates else 0,
            "formalized": formalized["c"] if formalized else 0,
            "deprecated": deprecated["c"] if deprecated else 0,
            "total": (candidates["c"] if candidates else 0) + (formalized["c"] if formalized else 0),
            "ready_for_formalization": len(ready_candidates),
            "ready_candidates": ready_candidates[:10],  # Top 10
            "thresholds": {
                "min_usage": self.MIN_USAGE_THRESHOLD,
                "consistency": self.CONSISTENCY_THRESHOLD,
                "time_window_days": self.TIME_WINDOW_DAYS,
                "min_confidence": self.MIN_CONFIDENCE
            }
        }
    
    def auto_formalize_ready_candidates(self, actor: str = "system_auto") -> Dict[str, Any]:
        """Automatically formalize all ready candidates."""
        progress = self.get_learning_progress()
        ready_candidates = progress["ready_candidates"]
        
        results = {
            "processed": len(ready_candidates),
            "successful": 0,
            "failed": 0,
            "results": []
        }
        
        for candidate in ready_candidates:
            vocab_id = candidate["vocabulary_id"]
            result = self.formalize_candidate(vocab_id, actor)
            
            results["results"].append(result)
            if result["success"]:
                results["successful"] += 1
            else:
                results["failed"] += 1
        
        return results

# Global learning engine instance
learning_engine = VocabularyLearningEngine()
