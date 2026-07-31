"""Vocabulary usage tracking system."""

import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone, timedelta
from . import db

logger = logging.getLogger("momento.vocabulary_usage")

class VocabularyUsageTracker:
    """Track usage of vocabulary entries for learning system."""
    
    def __init__(self):
        self.tracking_enabled = True
    
    def track_usage(self, vocabulary_id: str, context: Dict, confidence: Optional[float] = None) -> str:
        """Track usage of a vocabulary entry."""
        if not self.tracking_enabled:
            return ""
        
        try:
            usage_id = db.execute(
                """INSERT INTO vocabulary_usage (vocabulary_id, context, confidence, created_at)
                   VALUES (?, ?, ?, ?)""",
                (vocabulary_id, json.dumps(context), confidence, db.utc_now())
            )
            
            # Update usage count in vocabulary entry
            db.execute(
                "UPDATE vocabulary_entries SET usage_count = usage_count + 1 WHERE id = ?",
                (vocabulary_id,)
            )
            
            logger.debug(f"Tracked usage for {vocabulary_id}: {usage_id}")
            return str(usage_id)
        except Exception as e:
            logger.error(f"Failed to track usage: {e}")
            return ""
    
    def track_batch_usage(self, usage_events: List[Dict]) -> List[str]:
        """Track multiple usage events in batch."""
        usage_ids = []
        
        for event in usage_events:
            vocabulary_id = event.get("vocabulary_id")
            context = event.get("context", {})
            confidence = event.get("confidence")
            
            usage_id = self.track_usage(vocabulary_id, context, confidence)
            if usage_id:
                usage_ids.append(usage_id)
        
        return usage_ids
    
    def get_usage_history(self, vocabulary_id: str, limit: int = 100) -> List[Dict]:
        """Get usage history for a vocabulary entry."""
        rows = db.query(
            """SELECT id, context, confidence, created_at
               FROM vocabulary_usage
               WHERE vocabulary_id = ?
               ORDER BY created_at DESC LIMIT ?""",
            (vocabulary_id, limit)
        )
        
        return [dict(row) for row in rows]
    
    def get_usage_statistics(self, vocabulary_id: str) -> Dict[str, Any]:
        """Get usage statistics for a vocabulary entry."""
        # Get total usage count
        count_row = db.query_one(
            "SELECT COUNT(*) as c FROM vocabulary_usage WHERE vocabulary_id = ?",
            (vocabulary_id,)
        )
        
        # Get average confidence
        confidence_row = db.query_one(
            "SELECT AVG(confidence) as avg_conf FROM vocabulary_usage WHERE vocabulary_id = ? AND confidence IS NOT NULL",
            (vocabulary_id,)
        )
        
        # Get time range
        time_row = db.query_one(
            """SELECT MIN(created_at) as first_usage, MAX(created_at) as last_usage
               FROM vocabulary_usage WHERE vocabulary_id = ?""",
            (vocabulary_id,)
        )
        
        # Calculate usage rate (per day)
        usage_rate = 0
        if time_row and time_row["first_usage"] and time_row["last_usage"]:
            first_time = datetime.fromisoformat(time_row["first_usage"].replace("Z", "+00:00"))
            last_time = datetime.fromisoformat(time_row["last_usage"].replace("Z", "+00:00"))
            days_diff = max(1, (last_time - first_time).days)
            total_count = count_row["c"] if count_row else 0
            usage_rate = total_count / days_diff
        
        return {
            "total_usage": count_row["c"] if count_row else 0,
            "avg_confidence": round(confidence_row["avg_conf"], 4) if confidence_row and confidence_row["avg_conf"] else 0.0,
            "first_usage": time_row["first_usage"] if time_row else None,
            "last_usage": time_row["last_usage"] if time_row else None,
            "usage_rate_per_day": round(usage_rate, 2)
        }
    
    def get_recent_usage(self, hours: int = 24, limit: int = 50) -> List[Dict]:
        """Get recent usage across all vocabulary entries."""
        cutoff_time = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        
        rows = db.query(
            """SELECT vu.id, vu.vocabulary_id, ve.name, vu.confidence, vu.created_at
               FROM vocabulary_usage vu
               JOIN vocabulary_entries ve ON vu.vocabulary_id = ve.id
               WHERE vu.created_at >= ?
               ORDER BY vu.created_at DESC LIMIT ?""",
            (cutoff_time, limit)
        )
        
        return [dict(row) for row in rows]

# Global usage tracker instance
usage_tracker = VocabularyUsageTracker()
