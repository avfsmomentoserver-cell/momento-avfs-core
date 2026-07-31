"""Central vocabulary processor for multiplier-to-vocabulary translation."""

import json
import logging
import uuid
from typing import Any, Dict, List, Optional
from . import linguistics as ling, db

logger = logging.getLogger("momento.vocabulary_processor")

class VocabularyProcessor:
    """Master processor for vocabulary-to-multiplier translation."""
    
    def __init__(self):
        self._cache: Dict[str, Dict] = {}
        self._load_formalized_vocabulary()
    
    def _load_formalized_vocabulary(self):
        """Load formalized vocabulary from database."""
        try:
            rows = db.query(
                "SELECT id, type, name, mathematical_definition, linguistic_mapping "
                "FROM vocabulary_entries WHERE status = 'formalized'"
            )
            for row in rows:
                self._cache[row["id"]] = {
                    "id": row["id"],
                    "type": row["type"],
                    "name": row["name"],
                    "definition": json.loads(row["mathematical_definition"]),
                    "mapping": json.loads(row["linguistic_mapping"])
                }
            logger.info(f"Loaded {len(self._cache)} formalized vocabulary entries")
        except Exception as e:
            logger.warning(f"Could not load vocabulary: {e}")
    
    def multiplier_to_concept(self, multiplier: float, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Translate multiplier to vocabulary concept."""
        # Start with base linguistics
        base_token = ling.tokenize(multiplier)
        
        # Check for custom vocabulary matches
        custom_matches = self._find_vocabulary_matches(multiplier, context)
        
        return {
            "base": base_token.as_dict(),
            "custom": custom_matches,
            "multiplier": multiplier,
            "timestamp": db.utc_now()
        }
    
    def _find_vocabulary_matches(self, multiplier: float, context: Optional[Dict]) -> List[Dict]:
        """Find vocabulary entries that match this multiplier."""
        matches = []
        for vocab_id, vocab in self._cache.items():
            if self._matches_definition(multiplier, vocab["definition"]):
                matches.append({
                    "id": vocab_id,
                    "name": vocab["name"],
                    "type": vocab["type"],
                    "confidence": vocab["mapping"].get("confidence", 0.5)
                })
        return sorted(matches, key=lambda m: m["confidence"], reverse=True)
    
    def _matches_definition(self, multiplier: float, definition: Dict) -> bool:
        """Check if multiplier matches vocabulary definition."""
        # Check multiplier range
        if "multiplier_range" in definition:
            lo, hi = definition["multiplier_range"]
            if not (lo <= multiplier < hi):
                return False
        return True
    
    def concept_to_multiplier(self, concept: str, context: Dict) -> float:
        """Reverse translate concept to multiplier."""
        # Find vocabulary entry by name
        for vocab_id, vocab in self._cache.items():
            if vocab["name"].lower() == concept.lower():
                # Return midpoint of range
                if "multiplier_range" in vocab["definition"]:
                    lo, hi = vocab["definition"]["multiplier_range"]
                    return (lo + hi) / 2
        # Fallback to base linguistics
        return 1.0
    
    def batch_translate(self, multipliers: List[float]) -> List[Dict]:
        """Batch process multipliers to concepts."""
        return [self.multiplier_to_concept(m) for m in multipliers]
    
    def register_pattern(self, pattern: Dict) -> str:
        """Register new pattern discovery."""
        pattern_id = pattern.get("id") or self._generate_id()
        
        try:
            db.execute(
                """INSERT INTO vocabulary_entries 
                   (id, type, name, mathematical_definition, linguistic_mapping, source, status, discovered_at, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    pattern_id,
                    pattern["type"],
                    pattern["name"],
                    json.dumps(pattern["mathematical_definition"]),
                    json.dumps(pattern["linguistic_mapping"]),
                    pattern["source"],
                    "candidate",
                    pattern.get("discovered_at", db.utc_now()),
                    db.utc_now()
                )
            )
            
            self._cache[pattern_id] = {
                "id": pattern_id,
                "type": pattern["type"],
                "name": pattern["name"],
                "definition": pattern["mathematical_definition"],
                "mapping": pattern["linguistic_mapping"]
            }
            
            logger.info(f"Registered pattern: {pattern_id}")
            return pattern_id
        except Exception as e:
            logger.error(f"Failed to register pattern: {e}")
            raise
    
    def _generate_id(self) -> str:
        """Generate unique vocabulary ID."""
        return f"vocab_{uuid.uuid4().hex[:12]}"
    
    def get_vocabulary_state(self) -> Dict:
        """Get current vocabulary snapshot."""
        return {
            "total_entries": len(self._cache),
            "by_type": self._count_by_type(),
            "by_source": self._count_by_source(),
            "recent_discoveries": self._get_recent_discoveries()
        }
    
    def _count_by_type(self) -> Dict[str, int]:
        counts = {}
        for vocab in self._cache.values():
            counts[vocab["type"]] = counts.get(vocab["type"], 0) + 1
        return counts
    
    def _count_by_source(self) -> Dict[str, int]:
        counts = {}
        rows = db.query("SELECT source, COUNT(*) as c FROM vocabulary_entries GROUP BY source")
        for row in rows:
            counts[row["source"]] = row["c"]
        return counts
    
    def _get_recent_discoveries(self) -> List[Dict]:
        rows = db.query(
            "SELECT id, name, type, discovered_at FROM vocabulary_entries "
            "ORDER BY discovered_at DESC LIMIT 10"
        )
        return [dict(row) for row in rows]

# Global processor instance
processor = VocabularyProcessor()
