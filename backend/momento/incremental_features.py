"""Incremental feature updates for new rounds."""

import logging
from typing import Any, Dict, List, Optional
from collections import deque

logger = logging.getLogger("momento.incremental_features")


class IncrementalFeatureState:
    """Maintain incremental state for feature computation."""
    
    def __init__(self, window_size: int = 100) -> None:
        self.window_size = window_size
        self.multipliers: deque = deque(maxlen=window_size)
        self.bands: deque = deque(maxlen=window_size)
        self.timestamps: deque = deque(maxlen=window_size)
        
        # Cached feature states
        self.pressure_state = {}
        self.baseline_state = {}
        self.moonshot_state = {}
        self.band_state = {}
    
    def add_round(self, round_data: Dict[str, Any]) -> None:
        """Add a new round to the state.
        
        Args:
            round_data: Round dictionary with multiplier, band, timestamp
        """
        self.multipliers.append(round_data["multiplier"])
        self.bands.append(round_data.get("band", "low"))
        self.timestamps.append(round_data.get("timestamp"))
        
        logger.debug(f"Added round: multiplier={round_data['multiplier']}, window_size={len(self.multipliers)}")
    
    def update_pressure(self) -> Dict[str, Any]:
        """Update pressure incrementally.
        
        Returns:
            Updated pressure state
        """
        if len(self.multipliers) < 20:
            return self.pressure_state
        
        # Compute pressure on current window
        try:
            from features.pressure.detector import CeilingDetector
            from features.pressure.calculator import PressureCalculator
            
            rounds = [
                {"multiplier": m, "band": b}
                for m, b in zip(self.multipliers, self.bands)
            ]
            
            detector = CeilingDetector()
            ceilings = detector.detect_resistance_ceilings(rounds)
            
            if ceilings:
                calculator = PressureCalculator()
                pressure_data = calculator.compute_pressure(rounds, ceilings)
                self.pressure_state = pressure_data
            
        except Exception as e:
            logger.error(f"Pressure update failed: {e}")
        
        return self.pressure_state
    
    def update_baseline(self) -> Dict[str, Any]:
        """Update baseline incrementally.
        
        Returns:
            Updated baseline state
        """
        if len(self.multipliers) < 20:
            return self.baseline_state
        
        try:
            from features.equal_baseline.converter import MultiplierConverter
            from features.equal_baseline.trendlines import TrendlineComputer
            
            converter = MultiplierConverter()
            baseline_values = converter.convert_multipliers_to_baseline(list(self.multipliers))
            
            computer = TrendlineComputer()
            trendlines = computer.compute_trendlines(baseline_values)
            
            self.baseline_state = {
                "values": baseline_values[-20:],
                "trendlines": trendlines
            }
            
        except Exception as e:
            logger.error(f"Baseline update failed: {e}")
        
        return self.baseline_state
    
    def update_moonshot(self, pressure_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update moonshot prediction incrementally.
        
        Args:
            pressure_data: Current pressure data
            
        Returns:
            Updated moonshot state
        """
        if len(self.multipliers) < 20:
            return self.moonshot_state
        
        try:
            from features.moonshot_scanner.linguistics import MoonshotLinguistics
            from features.moonshot_scanner.scanner import MoonshotScanner
            
            rounds = [
                {"multiplier": m, "band": b}
                for m, b in zip(self.multipliers, self.bands)
            ]
            
            # Get ceilings from pressure state
            ceilings = pressure_data.get("ceilings", [])
            
            linguistics = MoonshotLinguistics()
            factors = linguistics.compute_all_linguistics(rounds, pressure_data, ceilings)
            
            scanner = MoonshotScanner()
            moonshot_result = scanner.scan_moonshot_conditions(rounds, factors)
            
            self.moonshot_state = moonshot_result
            
        except Exception as e:
            logger.error(f"Moonshot update failed: {e}")
        
        return self.moonshot_state
    
    def update_bands(self) -> Dict[str, Any]:
        """Update band analysis incrementally.
        
        Returns:
            Updated band state
        """
        if len(self.multipliers) < 20:
            return self.band_state
        
        try:
            from features.band_analysis.ladders import LadderDetector
            from features.band_analysis.relativity import BandRelativity
            
            rounds = [
                {"multiplier": m, "band": b}
                for m, b in zip(self.multipliers, self.bands)
            ]
            
            detector = LadderDetector()
            ladder_results = detector.analyze_all_bands(rounds)
            
            relativity = BandRelativity()
            band_relativity = relativity.compute_band_relativity(rounds)
            
            self.band_state = {
                "ladders": ladder_results,
                "relativity": band_relativity
            }
            
        except Exception as e:
            logger.error(f"Band update failed: {e}")
        
        return self.band_state
    
    def update_all(self) -> Dict[str, Any]:
        """Update all features incrementally.
        
        Returns:
            Combined feature state
        """
        # Update in dependency order
        pressure = self.update_pressure()
        baseline = self.update_baseline()
        moonshot = self.update_moonshot(pressure)
        bands = self.update_bands()
        
        return {
            "pressure": pressure,
            "baseline": baseline,
            "moonshot": moonshot,
            "bands": bands
        }
    
    def get_state(self) -> Dict[str, Any]:
        """Get current feature state.
        
        Returns:
            Current feature state
        """
        return {
            "pressure": self.pressure_state,
            "baseline": self.baseline_state,
            "moonshot": self.moonshot_state,
            "bands": self.band_state,
            "window_size": len(self.multipliers)
        }
    
    def reset(self) -> None:
        """Reset feature state."""
        self.multipliers.clear()
        self.bands.clear()
        self.timestamps.clear()
        self.pressure_state = {}
        self.baseline_state = {}
        self.moonshot_state = {}
        self.band_state = {}
        logger.debug("Feature state reset")


# Global incremental state manager
incremental_state = IncrementalFeatureState()
