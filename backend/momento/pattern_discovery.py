"""Pattern discovery coordinator for vocabulary learning."""

import json
import logging
from typing import Any, Dict, List
from . import db, vocabulary_processor as vp
from .pattern_discovery_dna import dna_discovery
from .pattern_discovery_pressure import pressure_discovery
from .pattern_discovery_moonshot import moonshot_discovery

logger = logging.getLogger("momento.pattern_discovery")

class PatternDiscoveryCoordinator:
    """Coordinate pattern discovery from all sources."""
    
    def __init__(self):
        self.sources = {
            "dna": dna_discovery,
            "pressure": pressure_discovery,
            "moonshot": moonshot_discovery
        }
    
    def discover_all(self, rounds: List[Dict], settings: Any, sources: List[str] = None) -> Dict[str, Any]:
        """Discover patterns from specified sources (or all if None)."""
        if sources is None:
            sources = list(self.sources.keys())
        
        all_patterns = []
        source_results = {}
        
        for source in sources:
            if source not in self.sources:
                logger.warning(f"Unknown discovery source: {source}")
                continue
            
            try:
                if source == "dna":
                    patterns = self.sources[source].discover_patterns(rounds, settings)
                else:
                    patterns = self.sources[source].discover_patterns(rounds)
                
                source_results[source] = {
                    "patterns_found": len(patterns),
                    "patterns": patterns
                }
                all_patterns.extend(patterns)
                
                logger.info(f"{source} discovery: {len(patterns)} patterns")
            except Exception as e:
                logger.error(f"{source} discovery failed: {e}")
                source_results[source] = {
                    "error": str(e),
                    "patterns_found": 0
                }
        
        return {
            "total_patterns": len(all_patterns),
            "by_source": source_results,
            "patterns": all_patterns
        }
    
    def process_discoveries(self, discoveries: List[Dict]) -> List[str]:
        """Process and register pattern discoveries."""
        registered_ids = []
        
        for discovery in discoveries:
            try:
                pattern_id = vp.processor.register_pattern(discovery)
                registered_ids.append(pattern_id)
                
                # Log to pattern_discoveries table
                db.execute(
                    """INSERT INTO pattern_discoveries 
                       (discovery_source, raw_pattern, processed_pattern, vocabulary_id, status, processed_at, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        discovery["source"],
                        json.dumps(discovery),
                        json.dumps(discovery),
                        pattern_id,
                        "processed",
                        db.utc_now(),
                        db.utc_now()
                    )
                )
                
                logger.info(f"Registered pattern: {pattern_id}")
            except Exception as e:
                logger.error(f"Failed to process discovery: {e}")
        
        return registered_ids
    
    def trigger_discovery_cycle(self, source: str = "aviator") -> Dict[str, Any]:
        """Trigger a complete discovery cycle for a source."""
        from . import store, analysis
        
        # Get recent rounds
        rounds = store.history(source, 600)
        settings = store.analysis_settings()
        
        if not rounds:
            return {
                "source": source,
                "status": "no_data",
                "message": "No rounds available for discovery"
            }
        
        # Discover patterns
        discovery_results = self.discover_all(rounds, settings)
        
        # Process discoveries
        registered = self.process_discoveries(discovery_results["patterns"])
        
        return {
            "source": source,
            "status": "success",
            "rounds_analyzed": len(rounds),
            "patterns_found": discovery_results["total_patterns"],
            "patterns_registered": len(registered),
            "vocabulary_ids": registered,
            "by_source": discovery_results["by_source"]
        }

# Global coordinator instance
coordinator = PatternDiscoveryCoordinator()
