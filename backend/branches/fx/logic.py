"""Branch-specific logic layer for FX branch.

This module contains the FX branch's specific analysis and processing logic,
using the shared global database but applying FX state machine processing.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Sequence

import sys
from pathlib import Path

# Add parent directory to path for imports
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

import global_db
from momento.momento_fx_state import (
    MarketStateEngine,
    MarketState,
    TrendState,
    VolatilityState,
    PointPhysics,
    MarketStateSnapshot,
)

# Use module directly instead of importing specific name
gdb = global_db

logger = logging.getLogger("branch.fx")


class FXBranchLogic:
    """FX branch-specific logic processor."""
    
    def __init__(self):
        self.state_engine = MarketStateEngine()
        self.current_branch = "fx"
        self.gdb = global_db
    
    def process_rounds(self, source: str, limit: int = 100) -> Dict[str, Any]:
        """Process rounds using FX state machine logic."""
        # Get raw data from global database
        rounds_data = self.gdb.get_rounds(source, limit, data_type="crash")
        multipliers = [float(r["multiplier"]) for r in rounds_data["data"]]
        
        if not multipliers:
            return {
                "source": source,
                "state": None,
                "error": "No rounds available for processing"
            }
        
        # Process with FX state engine
        snapshot = self.state_engine.analyze_state(multipliers)
        
        # Store branch-specific results
        self._store_state_snapshot(source, snapshot)
        
        return {
            "source": source,
            "branch": self.current_branch,
            "state": snapshot.as_dict(),
            "rounds_processed": len(multipliers)
        }
    
    def analyze_state_sequence(self, source: str, limit: int = 200) -> Dict[str, Any]:
        """Analyze state sequence for a source."""
        rounds_data = self.gdb.get_rounds(source, limit, data_type="crash")
        multipliers = [float(r["multiplier"]) for r in rounds_data["data"]]
        
        if len(multipliers) < 20:
            return {
                "source": source,
                "error": "Insufficient data for sequence analysis (need at least 20 rounds)"
            }
        
        # Analyze state sequence
        from momento.momento_fx_state import analyze_market_state_sequence
        snapshots = analyze_market_state_sequence(multipliers)
        
        # Store branch-specific results
        for snapshot in snapshots:
            self._store_state_snapshot(source, snapshot)
        
        return {
            "source": source,
            "branch": self.current_branch,
            "sequence": [s.as_dict() for s in snapshots],
            "count": len(snapshots)
        }
    
    def get_composite_indices(self, source: str, limit: int = 100) -> Dict[str, Any]:
        """Get composite market physics indices."""
        rounds_data = self.gdb.get_rounds(source, limit, data_type="crash")
        multipliers = [float(r["multiplier"]) for r in rounds_data["data"]]
        
        if len(multipliers) < 10:
            return {
                "source": source,
                "error": "Insufficient data for indices calculation"
            }
        
        snapshot = self.state_engine.analyze_state(multipliers)
        
        return {
            "source": source,
            "branch": self.current_branch,
            "indices": {
                "compression": snapshot.compression_score,
                "expansion": snapshot.expansion_score,
                "liquidity": snapshot.liquidity_score,
                "momentum": snapshot.momentum_score,
                "exhaustion": snapshot.exhaustion_score,
                "entropy": snapshot.entropy_score,
                "volatility": snapshot.volatility_score,
                "persistence": snapshot.persistence_score,
                "efficiency": snapshot.efficiency_score,
                "fractal_alignment": snapshot.fractal_alignment,
            },
            "physics": snapshot.physics.as_dict()
        }
    
    def _store_state_snapshot(self, source: str, snapshot: MarketStateSnapshot) -> None:
        """Store state snapshot in branch-specific table."""
        data = {
            "source": source,
            "timestamp": snapshot.timestamp,
            "state": snapshot.physics.state.value,
            "trend": snapshot.physics.trend.value,
            "volatility": snapshot.physics.volatility.value,
            "compression": snapshot.compression_score,
            "expansion": snapshot.expansion_score,
            "momentum": snapshot.momentum_score,
            "liquidity": snapshot.liquidity_score,
            "entropy": snapshot.entropy_score,
            "dna_signature": snapshot.dna_signature,
            "dna_confidence": snapshot.dna_confidence,
        }
        
        try:
            self.gdb.store_branch_data(self.current_branch, "state_snapshots", data)
            logger.debug(f"Stored FX state snapshot for {source}")
        except Exception as e:
            logger.error(f"Failed to store state snapshot: {e}")
    
    def store_transition(self, source: str, from_state: str, to_state: str, 
                      probability: float) -> None:
        """Store state transition in branch-specific table."""
        data = {
            "source": source,
            "from_state": from_state,
            "to_state": to_state,
            "probability": probability,
            "timestamp": self.gdb.utc_now(),
        }
        
        try:
            self.gdb.store_branch_data(self.current_branch, "state_transitions", data)
            logger.debug(f"Stored FX state transition: {from_state} -> {to_state}")
        except Exception as e:
            logger.error(f"Failed to store transition: {e}")
    
    def get_branch_status(self) -> Dict[str, Any]:
        """Get FX branch status and statistics."""
        metadata = self.gdb.get_branch_metadata(self.current_branch)
        db_stats = self.gdb.get_database_stats()
        
        return {
            "branch": self.current_branch,
            "active": metadata.get("active", 0) == 1,
            "last_sync": metadata.get("last_sync"),
            "config": metadata.get("config", "{}"),
            "database_stats": db_stats
        }


# FX branch logic instance
fx_logic = FXBranchLogic()