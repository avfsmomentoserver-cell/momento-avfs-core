"""DNA pattern discovery for vocabulary learning."""

import json
import logging
from typing import Any, Dict, List
from . import analysis, db

logger = logging.getLogger("momento.pattern_discovery.dna")

class DnaPatternDiscovery:
    """Discover patterns from DNA analysis."""
    
    def __init__(self):
        self.min_similarity = 0.85  # Minimum similarity for pattern extraction
        self.min_matches = 3  # Minimum matches to consider pattern
    
    def discover_patterns(self, rounds: List[Dict], settings: Any) -> List[Dict]:
        """Extract patterns from DNA analysis."""
        patterns = []
        
        if not rounds or len(rounds) < 50:
            logger.warning("Insufficient rounds for DNA discovery")
            return patterns
        
        multipliers = [float(r["multiplier"]) for r in rounds]
        dna_report = analysis.dna_report(multipliers, settings)
        
        # Extract signature patterns
        patterns.extend(self._extract_signature_patterns(dna_report))
        
        # Extract gap patterns
        patterns.extend(self._extract_gap_patterns(multipliers))
        
        # Extract sequence patterns
        patterns.extend(self._extract_sequence_patterns(multipliers, settings))
        
        logger.info(f"Discovered {len(patterns)} DNA patterns")
        return patterns
    
    def _extract_signature_patterns(self, dna_report: Dict) -> List[Dict]:
        """Extract patterns from DNA signature matches."""
        patterns = []
        
        matches = dna_report.get("matches", [])
        if not matches:
            return patterns
        
        # Group matches by similarity
        similarity_groups = {}
        for match in matches:
            similarity = round(match["similarity"], 2)
            if similarity not in similarity_groups:
                similarity_groups[similarity] = []
            similarity_groups[similarity].append(match)
        
        # Create patterns from high-similarity groups
        for similarity, group in similarity_groups.items():
            if similarity >= self.min_similarity and len(group) >= self.min_matches:
                # Analyze outcomes
                outcomes = [m.get("next_multiplier", 0) for m in group]
                avg_outcome = sum(outcomes) / len(outcomes) if outcomes else 0
                
                pattern = {
                    "type": "pattern",
                    "name": f"dna_signature_{similarity:.2f}",
                    "mathematical_definition": {
                        "similarity_threshold": similarity,
                        "min_matches": len(group),
                        "expected_outcome_range": [min(outcomes), max(outcomes)] if outcomes else [0, 0],
                        "avg_outcome": avg_outcome
                    },
                    "linguistic_mapping": {
                        "description": f"DNA signature pattern with {similarity:.1%} similarity, occurring {len(group)} times, average outcome {avg_outcome:.2f}x",
                        "confidence": similarity,
                        "usage_count": len(group)
                    },
                    "source": "dna",
                    "discovered_at": db.utc_now(),
                    "status": "candidate"
                }
                patterns.append(pattern)
        
        return patterns
    
    def _extract_gap_patterns(self, multipliers: List[float]) -> List[Dict]:
        """Extract large gap patterns."""
        patterns = []
        
        if len(multipliers) < 10:
            return patterns
        
        # Find large gaps
        gaps = []
        for i in range(1, len(multipliers)):
            gap = multipliers[i] - multipliers[i-1]
            if gap > 0:
                gaps.append({
                    "index": i,
                    "gap": gap,
                    "from_multiplier": multipliers[i-1],
                    "to_multiplier": multipliers[i]
                })
        
        # Find significant gap patterns
        if gaps:
            # Sort by gap size
            gaps.sort(key=lambda g: g["gap"], reverse=True)
            
            # Take top 5 largest gaps
            top_gaps = gaps[:5]
            
            for gap_data in top_gaps:
                if gap_data["gap"] >= 2.0:  # Only gaps >= 2x
                    pattern = {
                        "type": "pattern",
                        "name": f"large_gap_{gap_data['gap']:.1f}x",
                        "mathematical_definition": {
                            "gap_size": gap_data["gap"],
                            "from_range": [gap_data["from_multiplier"] * 0.9, gap_data["from_multiplier"] * 1.1],
                            "to_range": [gap_data["to_multiplier"] * 0.9, gap_data["to_multiplier"] * 1.1]
                        },
                        "linguistic_mapping": {
                            "description": f"Large gap pattern: {gap_data['from_multiplier']:.2f}x → {gap_data['to_multiplier']:.2f}x ({gap_data['gap']:.1f}x increase)",
                            "confidence": min(gap_data["gap"] / 10.0, 1.0),
                            "usage_count": 1
                        },
                        "source": "dna",
                        "discovered_at": db.utc_now(),
                        "status": "candidate"
                    }
                    patterns.append(pattern)
        
        return patterns
    
    def _extract_sequence_patterns(self, multipliers: List[float], settings: Any) -> List[Dict]:
        """Extract repeating sequence patterns."""
        patterns = []
        
        if len(multipliers) < settings.dna_window * 2:
            return patterns
        
        window_size = settings.dna_window
        from . import linguistics as ling
        
        # Get band sequences
        sequences = []
        for i in range(len(multipliers) - window_size + 1):
            window = multipliers[i:i + window_size]
            sequence = [ling.band_for(m)["key"] for m in window]
            sequences.append(sequence)
        
        # Find repeating sequences
        sequence_counts = {}
        for seq in sequences:
            seq_key = tuple(seq)
            sequence_counts[seq_key] = sequence_counts.get(seq_key, 0) + 1
        
        # Extract patterns from repeating sequences
        for seq, count in sequence_counts.items():
            if count >= self.min_matches:
                pattern = {
                    "type": "pattern",
                    "name": f"sequence_{'_'.join(seq[:3])}",
                    "mathematical_definition": {
                        "sequence": list(seq),
                        "window_size": window_size,
                        "occurrence_count": count
                    },
                    "linguistic_mapping": {
                        "description": f"Repeating band sequence: {' → '.join(seq[:5])}... (occurs {count} times)",
                        "confidence": min(count / 10.0, 1.0),
                        "usage_count": count
                    },
                    "source": "dna",
                    "discovered_at": db.utc_now(),
                    "status": "candidate"
                }
                patterns.append(pattern)
        
        return patterns

# Global DNA discovery instance
dna_discovery = DnaPatternDiscovery()
