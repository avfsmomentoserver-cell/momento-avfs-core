"""Auto-import system for vocabulary features."""

import logging
from typing import Any, Dict, List
from . import db, vocabulary_features as vf
from features import registry

logger = logging.getLogger("momento.vocabulary_auto_import")

class VocabularyAutoImport:
    """Automatically import formalized vocabulary as features."""
    
    def __init__(self):
        self.auto_import_enabled = True
    
    def import_formalized_vocabulary(self) -> Dict[str, Any]:
        """Import all formalized vocabulary as features."""
        if not self.auto_import_enabled:
            return {
                "success": False,
                "reason": "Auto-import disabled"
            }
        
        # Get all formalized vocabulary
        formalized = db.query(
            "SELECT * FROM vocabulary_entries WHERE status = 'formalized'"
        )
        
        if not formalized:
            return {
                "success": True,
                "imported": 0,
                "message": "No formalized vocabulary to import"
            }
        
        imported = 0
        failed = 0
        results = []
        
        for vocab_row in formalized:
            vocab_id = vocab_row["id"]
            vocab_name = vocab_row["name"]
            
            try:
                # Convert to feature
                feature = vf.feature_converter.vocabulary_to_feature(dict(vocab_row))
                
                # Register in feature registry
                feature_name = feature.get_name()
                registry.register(feature_name, type(feature))
                
                imported += 1
                results.append({
                    "vocabulary_id": vocab_id,
                    "feature_name": feature_name,
                    "status": "success"
                })
                
                logger.info(f"Imported vocabulary {vocab_id} as feature {feature_name}")
            except Exception as e:
                failed += 1
                results.append({
                    "vocabulary_id": vocab_id,
                    "status": "failed",
                    "error": str(e)
                })
                logger.error(f"Failed to import {vocab_id}: {e}")
        
        return {
            "success": True,
            "total": len(formalized),
            "imported": imported,
            "failed": failed,
            "results": results
        }
    
    def import_single_vocabulary(self, vocabulary_id: str) -> Dict[str, Any]:
        """Import a single vocabulary entry as feature."""
        try:
            vocab_row = db.query_one(
                "SELECT * FROM vocabulary_entries WHERE id = ? AND status = 'formalized'",
                (vocabulary_id,)
            )
            
            if not vocab_row:
                return {
                    "success": False,
                    "reason": "Vocabulary not found or not formalized"
                }
            
            # Convert to feature
            feature = vf.feature_converter.vocabulary_to_feature(dict(vocab_row))
            
            # Register in feature registry
            feature_name = feature.get_name()
            registry.register(feature_name, type(feature))
            
            logger.info(f"Imported vocabulary {vocabulary_id} as feature {feature_name}")
            
            return {
                "success": True,
                "vocabulary_id": vocabulary_id,
                "feature_name": feature_name
            }
        except Exception as e:
            logger.error(f"Failed to import {vocabulary_id}: {e}")
            return {
                "success": False,
                "reason": str(e)
            }
    
    def remove_vocabulary_feature(self, vocabulary_id: str) -> Dict[str, Any]:
        """Remove a vocabulary feature from registry."""
        try:
            # Get feature name
            vocab_row = db.query_one(
                "SELECT name FROM vocabulary_entries WHERE id = ?",
                (vocabulary_id,)
            )
            
            if not vocab_row:
                return {
                    "success": False,
                    "reason": "Vocabulary not found"
                }
            
            feature_name = f"vocab_{vocab_row['name'].lower().replace(' ', '_')}"
            
            # Disable in registry
            registry.disable(feature_name)
            
            # Remove from cache
            if vocabulary_id in vf.feature_converter.feature_cache:
                del vf.feature_converter.feature_cache[vocabulary_id]
            
            logger.info(f"Removed vocabulary feature {feature_name}")
            
            return {
                "success": True,
                "vocabulary_id": vocabulary_id,
                "feature_name": feature_name
            }
        except Exception as e:
            logger.error(f"Failed to remove {vocabulary_id}: {e}")
            return {
                "success": False,
                "reason": str(e)
            }
    
    def get_feature_mapping(self) -> Dict[str, Any]:
        """Get mapping of vocabulary to features."""
        formalized = db.query(
            "SELECT id, name FROM vocabulary_entries WHERE status = 'formalized'"
        )
        
        mapping = {}
        for row in formalized:
            vocab_id = row["id"]
            feature_name = f"vocab_{row['name'].lower().replace(' ', '_')}"
            
            # Check if registered
            is_registered = feature_name in registry.list_features()
            
            mapping[vocab_id] = {
                "vocabulary_name": row["name"],
                "feature_name": feature_name,
                "registered": is_registered
            }
        
        return mapping

# Global auto-import instance
auto_import = VocabularyAutoImport()
