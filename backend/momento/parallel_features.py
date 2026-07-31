"""Parallel computation for independent features."""

import asyncio
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("momento.parallel_features")


class ParallelFeatureComputer:
    """Compute independent features in parallel."""
    
    def __init__(self) -> None:
        self.use_async = True
    
    async def compute_all_features_async(
        self,
        rounds: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Compute all features in parallel using asyncio.
        
        Args:
            rounds: Historical rounds
            
        Returns:
            Combined feature results
        """
        if not rounds or len(rounds) < 20:
            return {}
        
        # Create tasks for independent features
        tasks = [
            self._compute_pressure_async(rounds),
            self._compute_baseline_async(rounds),
            self._compute_bands_async(rounds)
        ]
        
        # Run tasks in parallel
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Combine results
            combined = {}
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Feature computation failed: {result}")
                    continue
                if isinstance(result, dict):
                    combined.update(result)
            
            # Compute dependent features (moonshot depends on pressure)
            if "pressure" in combined:
                moonshot = await self._compute_moonshot_async(rounds, combined["pressure"])
                if isinstance(moonshot, dict):
                    combined["moonshot"] = moonshot
            
            return combined
            
        except Exception as e:
            logger.error(f"Parallel computation failed: {e}")
            return {}
    
    async def _compute_pressure_async(self, rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compute pressure asynchronously.
        
        Args:
            rounds: Historical rounds
            
        Returns:
            Pressure data
        """
        try:
            from features.pressure.detector import CeilingDetector
            from features.pressure.calculator import PressureCalculator
            from features.pressure.metrics import PressureMetrics
            
            detector = CeilingDetector()
            ceilings = detector.detect_resistance_ceilings(rounds)
            
            if ceilings:
                calculator = PressureCalculator()
                pressure_data = calculator.compute_pressure(rounds, ceilings)
                metrics = PressureMetrics()
                return {"pressure": metrics.format_pressure_gauge(pressure_data)}
            
            return {"pressure": {}}
            
        except Exception as e:
            logger.error(f"Pressure computation failed: {e}")
            return {"pressure": {}}
    
    async def _compute_baseline_async(self, rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compute baseline asynchronously.
        
        Args:
            rounds: Historical rounds
            
        Returns:
            Baseline data
        """
        try:
            from features.equal_baseline.converter import MultiplierConverter
            from features.equal_baseline.trendlines import TrendlineComputer
            
            multipliers = [r["multiplier"] for r in rounds]
            
            converter = MultiplierConverter()
            baseline_values = converter.convert_multipliers_to_baseline(multipliers)
            
            computer = TrendlineComputer()
            trendlines = computer.compute_trendlines(baseline_values)
            shifts = computer.detect_momentum_shifts(trendlines["momentum"])
            
            return {
                "baseline": {
                    "values": baseline_values[-20:],
                    "trendlines": trendlines,
                    "shifts": shifts[-5:]
                }
            }
            
        except Exception as e:
            logger.error(f"Baseline computation failed: {e}")
            return {"baseline": {}}
    
    async def _compute_bands_async(self, rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compute band analysis asynchronously.
        
        Args:
            rounds: Historical rounds
            
        Returns:
            Band data
        """
        try:
            from features.band_analysis.ladders import LadderDetector
            from features.band_analysis.relativity import BandRelativity
            
            detector = LadderDetector()
            ladder_results = detector.analyze_all_bands(rounds)
            
            relativity = BandRelativity()
            band_relativity = relativity.compute_band_relativity(rounds)
            
            return {
                "bands": ladder_results,
                "band_relativity": band_relativity
            }
            
        except Exception as e:
            logger.error(f"Band computation failed: {e}")
            return {"bands": {}, "band_relativity": {}}
    
    async def _compute_moonshot_async(
        self,
        rounds: List[Dict[str, Any]],
        pressure_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compute moonshot prediction asynchronously.
        
        Args:
            rounds: Historical rounds
            pressure_data: Pressure data
            
        Returns:
            Moonshot data
        """
        try:
            from features.moonshot_scanner.linguistics import MoonshotLinguistics
            from features.moonshot_scanner.scanner import MoonshotScanner
            
            linguistics = MoonshotLinguistics()
            factors = linguistics.compute_all_linguistics(rounds, pressure_data, [])
            
            scanner = MoonshotScanner()
            moonshot_result = scanner.scan_moonshot_conditions(rounds, factors)
            
            return moonshot_result
            
        except Exception as e:
            logger.error(f"Moonshot computation failed: {e}")
            return {}
    
    def compute_all_features_sync(self, rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compute all features synchronously (fallback).
        
        Args:
            rounds: Historical rounds
            
        Returns:
            Combined feature results
        """
        try:
            # Run async function in event loop
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is already running, use create_task
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, self.compute_all_features_async(rounds))
                    return future.result()
            else:
                return asyncio.run(self.compute_all_features_async(rounds))
        except Exception as e:
            logger.error(f"Sync computation failed: {e}")
            return {}


# Global parallel computer instance
parallel_computer = ParallelFeatureComputer()
