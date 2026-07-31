"""Vocabulary-to-feature conversion system."""

import json
import logging
from typing import Any, Dict, List
from features.base import BaseFeature
from . import db

logger = logging.getLogger("momento.vocabulary_features")

class VocabularyFeatureConverter:
    """Convert vocabulary entries to feature classes."""
    
    def __init__(self):
        self.feature_cache: Dict[str, BaseFeature] = {}
    
    def vocabulary_to_feature(self, vocabulary_entry: Dict) -> BaseFeature:
        """Convert a vocabulary entry to a feature class."""
        vocab_id = vocabulary_entry["id"]
        vocab_type = vocabulary_entry["type"]
        definition = json.loads(vocabulary_entry["mathematical_definition"])
        mapping = json.loads(vocabulary_entry["linguistic_mapping"])
        
        # Create dynamic feature class
        class DynamicVocabularyFeature(BaseFeature):
            """Dynamic feature generated from vocabulary."""
            
            def __init__(self, vocab_data: Dict):
                self.vocabulary = vocab_data
                self.definition = json.loads(vocab_data["mathematical_definition"])
                self.mapping = json.loads(vocab_data["linguistic_mapping"])
                self._name = f"vocab_{vocab_data['name'].lower().replace(' ', '_')}"
                self._description = self.mapping.get("description", "Vocabulary-based feature")
            
            def compute(self, rounds: List[Dict], settings: Dict) -> Dict:
                """Compute feature using vocabulary definition."""
                return self._apply_definition(rounds, settings)
            
            def backtest(self, rounds: List[Dict], config: Dict) -> Dict:
                """Backtest the vocabulary-based pattern."""
                return self._backtest_pattern(rounds, config)
            
            def get_metrics(self) -> List[str]:
                """Return metric names."""
                return [f"{self._name}_score", f"{self._name}_confidence"]
            
            def get_name(self) -> str:
                """Return feature name."""
                return self._name
            
            def get_description(self) -> str:
                """Return feature description."""
                return self._description
            
            def _apply_definition(self, rounds: List[Dict], settings: Dict) -> Dict:
                """Apply mathematical definition to compute feature."""
                multipliers = [float(r["multiplier"]) for r in rounds]
                
                # Apply based on definition type
                if "multiplier_range" in self.definition:
                    return self._compute_range_feature(multipliers)
                elif "sequence" in self.definition:
                    return self._compute_sequence_feature(multipliers)
                elif "ceiling_level" in self.definition:
                    return self._compute_ceiling_feature(multipliers)
                else:
                    return self._compute_generic_feature(multipliers)
            
            def _compute_range_feature(self, multipliers: List[float]) -> Dict:
                """Compute feature for multiplier range definition."""
                lo, hi = self.definition["multiplier_range"]
                matches = [m for m in multipliers if lo <= m < hi]
                
                return {
                    f"{self._name}_score": len(matches) / len(multipliers) if multipliers else 0,
                    f"{self._name}_confidence": self.mapping.get("confidence", 0.5),
                    "matches": len(matches),
                    "total": len(multipliers)
                }
            
            def _compute_sequence_feature(self, multipliers: List[float]) -> Dict:
                """Compute feature for sequence definition."""
                from . import linguistics as ling
                target_sequence = self.definition["sequence"]
                window_size = self.definition.get("window_size", len(target_sequence))
                
                matches = 0
                for i in range(len(multipliers) - window_size + 1):
                    window = multipliers[i:i + window_size]
                    window_sequence = [ling.band_for(m)["key"] for m in window]
                    if window_sequence == target_sequence:
                        matches += 1
                
                return {
                    f"{self._name}_score": matches / max(1, len(multipliers) - window_size + 1),
                    f"{self._name}_confidence": self.mapping.get("confidence", 0.5),
                    "matches": matches
                }
            
            def _compute_ceiling_feature(self, multipliers: List[float]) -> Dict:
                """Compute feature for ceiling definition."""
                ceiling_level = self.definition["ceiling_level"]
                tolerance = 0.05 * ceiling_level
                
                touches = [m for m in multipliers if abs(m - ceiling_level) <= tolerance]
                
                return {
                    f"{self._name}_score": len(touches) / len(multipliers) if multipliers else 0,
                    f"{self._name}_confidence": self.mapping.get("confidence", 0.5),
                    "touches": len(touches),
                    "ceiling_level": ceiling_level
                }
            
            def _compute_generic_feature(self, multipliers: List[float]) -> Dict:
                """Compute generic feature from definition."""
                # Default implementation - count occurrences in range
                if "target_multiplier" in self.definition:
                    target = self.definition["target_multiplier"]
                    tolerance = 0.1 * target
                    matches = [m for m in multipliers if abs(m - target) <= tolerance]
                    
                    return {
                        f"{self._name}_score": len(matches) / len(multipliers) if multipliers else 0,
                        f"{self._name}_confidence": self.mapping.get("confidence", 0.5),
                        "matches": len(matches)
                    }
                
                return {
                    f"{self._name}_score": 0.0,
                    f"{self._name}_confidence": 0.0,
                    "note": "No applicable computation method"
                }
            
            def _backtest_pattern(self, rounds: List[Dict], config: Dict) -> Dict:
                """Backtest the vocabulary pattern."""
                multipliers = [float(r["multiplier"]) for r in rounds]
                results = []
                
                # Simple backtest - check if pattern predicts outcomes
                if "multiplier_range" in self.definition:
                    lo, hi = self.definition["multiplier_range"]
                    for i in range(len(multipliers) - 1):
                        if lo <= multipliers[i] < hi:
                            next_mult = multipliers[i + 1]
                            results.append(next_mult)
                    
                    if results:
                        avg_outcome = sum(results) / len(results)
                        return {
                            "total_matches": len(results),
                            "average_outcome": avg_outcome,
                            "success_rate": len([r for r in results if r > 1.5]) / len(results)
                        }
                
                return {
                    "total_matches": 0,
                    "average_outcome": 0,
                    "success_rate": 0
                }
        
        # Create instance
        feature_instance = DynamicVocabularyFeature(vocabulary_entry)
        self.feature_cache[vocab_id] = feature_instance
        
        logger.info(f"Converted vocabulary {vocab_id} to feature")
        return feature_instance
    
    def batch_convert(self, vocabulary_ids: List[str]) -> Dict[str, BaseFeature]:
        """Convert multiple vocabulary entries to features."""
        features = {}
        
        for vocab_id in vocabulary_ids:
            vocab_row = db.query_one(
                "SELECT * FROM vocabulary_entries WHERE id = ? AND status = 'formalized'",
                (vocab_id,)
            )
            
            if vocab_row:
                try:
                    feature = self.vocabulary_to_feature(dict(vocab_row))
                    features[vocab_id] = feature
                except Exception as e:
                    logger.error(f"Failed to convert {vocab_id}: {e}")
        
        return features
    
    def get_feature(self, vocabulary_id: str) -> BaseFeature:
        """Get or create feature for vocabulary entry."""
        if vocabulary_id in self.feature_cache:
            return self.feature_cache[vocabulary_id]
        
        vocab_row = db.query_one(
            "SELECT * FROM vocabulary_entries WHERE id = ? AND status = 'formalized'",
            (vocabulary_id,)
        )
        
        if not vocab_row:
            raise ValueError(f"Vocabulary {vocabulary_id} not found or not formalized")
        
        return self.vocabulary_to_feature(dict(vocab_row))

# Global converter instance
feature_converter = VocabularyFeatureConverter()
