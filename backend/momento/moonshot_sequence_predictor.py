"""Moonshot sequence prediction based on filtering rounds in sessions.

This module implements prediction based on moonshot sequences deduced by filtering
rounds in sessions with a 10x+ reference threshold. The threshold is only used to
select which historical rounds count as moonshots; it is not a floor on the
predicted multiplier, which is derived from the historical sequence distribution.
"""

import logging
import math
import statistics
from typing import Any, Dict, List, Sequence, Tuple
from datetime import datetime
from . import config as cfg

logger = logging.getLogger("momento.moonshot_sequence_predictor")


class MoonshotSequencePredictor:
    """Predict moonshot sequences by filtering rounds in sessions."""
    
    def __init__(self, settings: cfg.AnalysisSettings):
        self.settings = settings
        # Base moonshot threshold (configurable, default 10x)
        self.base_threshold = settings.moonshot_threshold
        # Reference threshold for filtering historical moonshot rounds (10x+).
        # Used only to select which rounds qualify as moonshots — it is not a
        # floor on the predicted multiplier (that comes from the sequence data).
        self.extended_threshold = max(10.0, self.base_threshold)
        # Scaling factor for filtering rounds (relative to base threshold)
        self.filtering_scale = 1.0  # 1.0 means use base_threshold, 10.0 would be 10x base
        
    def filter_moonshot_rounds(
        self, 
        rounds: Sequence[Dict[str, Any]],
        threshold: float = None
    ) -> List[Dict[str, Any]]:
        """Filter rounds to identify moonshot events.
        
        Args:
            rounds: Historical rounds to filter
            threshold: Moonshot threshold (uses extended_threshold if None)
            
        Returns:
            Filtered rounds containing only moonshot events
        """
        if threshold is None:
            threshold = self.extended_threshold
            
        moonshot_rounds = [
            round_data for round_data in rounds 
            if round_data.get("multiplier", 0) >= threshold
        ]
        
        logger.info(f"Filtered {len(moonshot_rounds)} moonshot rounds from {len(rounds)} total rounds (threshold: {threshold}x)")
        return moonshot_rounds
    
    def deduce_moonshot_sequences(
        self,
        sessions: List[List[Dict[str, Any]]],
        scale_factor: float = 1.0
    ) -> List[Dict[str, Any]]:
        """Deduce moonshot sequences from filtered session rounds.

        Args:
            sessions: List of sessions, each containing rounds
            scale_factor: Threshold multiplier for the filtering reference
                (default 1.0 = 10x). scale_factor=1.0 gives a 10x reference,
                scale_factor=0.5 gives a 5x reference. Lower values are more
                comprehensive (include lower multipliers).

        Returns:
            List of deduced moonshot sequences with metadata
        """
        sequences = []
        
        for session_idx, session in enumerate(sessions):
            # Reference threshold for filtering historical moonshots:
            # base_threshold (10x) multiplied by scale_factor, floored at 10x.
            # This only selects which rounds count as moonshots — it is never
            # used as a floor on the predicted multiplier.
            scaled_threshold = self.base_threshold * scale_factor
            
            # Ensure minimum threshold of at least 10x for moonshot classification
            scaled_threshold = max(scaled_threshold, 10.0)
            
            # Filter moonshot rounds in this session
            moonshot_rounds = self.filter_moonshot_rounds(session, scaled_threshold)
            
            if len(moonshot_rounds) < 2:
                # Need at least 2 moonshots to form a sequence
                continue
                
            # Extract sequence metadata
            multipliers = [r["multiplier"] for r in moonshot_rounds]
            timestamps = [r.get("timestamp", "") for r in moonshot_rounds]
            
            # Calculate sequence properties
            sequence_data = {
                "session_index": session_idx,
                "session_rounds_count": len(session),
                "moonshot_count": len(moonshot_rounds),
                "multipliers": multipliers,
                "timestamps": timestamps,
                "threshold_used": scaled_threshold,
                "scale_factor": scale_factor,
                "peak_multiplier": max(multipliers) if multipliers else 0.0,
                "avg_multiplier": sum(multipliers) / len(multipliers) if multipliers else 0.0,
                "sequence_growth": self._calculate_sequence_growth(multipliers),
                "time_span": self._calculate_time_span(timestamps),
                "rounds_between_moonshots": self._calculate_rounds_between(session, moonshot_rounds)
            }
            
            sequences.append(sequence_data)
            logger.debug(f"Deduced moonshot sequence in session {session_idx}: {len(moonshot_rounds)} moonshots")
        
        logger.info(f"Deduced {len(sequences)} moonshot sequences from {len(sessions)} sessions")
        return sequences
    
    def _calculate_sequence_growth(self, multipliers: List[float]) -> Dict[str, float]:
        """Calculate growth patterns in a moonshot sequence."""
        if len(multipliers) < 2:
            return {"growth_rate": 0.0, "acceleration": 0.0, "volatility": 0.0}
        
        # Calculate growth rates between consecutive moonshots
        growth_rates = []
        for i in range(1, len(multipliers)):
            if multipliers[i-1] > 0:
                rate = (multipliers[i] - multipliers[i-1]) / multipliers[i-1]
                growth_rates.append(rate)
        
        avg_growth = sum(growth_rates) / len(growth_rates) if growth_rates else 0.0
        
        # Calculate acceleration (change in growth rate)
        acceleration = 0.0
        if len(growth_rates) >= 2:
            accel_changes = [growth_rates[i] - growth_rates[i-1] for i in range(1, len(growth_rates))]
            acceleration = sum(accel_changes) / len(accel_changes)
        
        # Calculate volatility (standard deviation of growth rates)
        volatility = 0.0
        if growth_rates:
            try:
                volatility = statistics.stdev(growth_rates) if len(growth_rates) > 1 else 0.0
            except statistics.StatisticsError:
                volatility = 0.0
        
        return {
            "growth_rate": round(avg_growth, 4),
            "acceleration": round(acceleration, 4),
            "volatility": round(volatility, 4)
        }
    
    def _calculate_time_span(self, timestamps: List[str]) -> Dict[str, Any]:
        """Calculate time span between moonshot events."""
        if len(timestamps) < 2:
            return {"duration_seconds": 0, "avg_seconds_between": 0.0}
        
        parsed_timestamps = []
        for ts in timestamps:
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                parsed_timestamps.append(dt)
            except (ValueError, TypeError):
                continue
        
        if len(parsed_timestamps) < 2:
            return {"duration_seconds": 0, "avg_seconds_between": 0.0}
        
        duration = (parsed_timestamps[-1] - parsed_timestamps[0]).total_seconds()
        
        # Calculate average time between consecutive moonshots
        time_diffs = [
            (parsed_timestamps[i] - parsed_timestamps[i-1]).total_seconds()
            for i in range(1, len(parsed_timestamps))
        ]
        avg_between = sum(time_diffs) / len(time_diffs) if time_diffs else 0.0
        
        return {
            "duration_seconds": round(duration, 2),
            "avg_seconds_between": round(avg_between, 2)
        }
    
    def _calculate_rounds_between(
        self, 
        session: List[Dict[str, Any]], 
        moonshot_rounds: List[Dict[str, Any]]
    ) -> List[int]:
        """Calculate number of rounds between moonshot events."""
        if len(moonshot_rounds) < 2:
            return []
        
        # Get indices of moonshot rounds in the session
        moonshot_indices = []
        for ms_round in moonshot_rounds:
            for idx, round_data in enumerate(session):
                if round_data.get("id") == ms_round.get("id"):
                    moonshot_indices.append(idx)
                    break
        
        # Calculate rounds between consecutive moonshots
        rounds_between = []
        for i in range(1, len(moonshot_indices)):
            diff = moonshot_indices[i] - moonshot_indices[i-1]
            rounds_between.append(diff)
        
        return rounds_between
    
    def predict_next_moonshot(
        self,
        sequences: List[Dict[str, Any]],
        current_session: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Predict next moonshot based on bias analysis of sequences.
        
        Args:
            sequences: Historical moonshot sequences
            current_session: Current session rounds
            
        Returns:
            Prediction with bias-based confidence and expected moonshot properties
        """
        if not sequences:
            return {
                "predicted": False,
                "confidence": 0.0,
                "reason": "No historical moonshot sequences available"
            }
        
        if not current_session:
            return {
                "predicted": False,
                "confidence": 0.0,
                "reason": "No current session data"
            }
        
        # Calculate bias from sequence growth patterns
        current_multipliers = [r["multiplier"] for r in current_session]
        current_avg = sum(current_multipliers) / len(current_multipliers) if current_multipliers else 0.0
        current_last = current_multipliers[-1] if current_multipliers else 1.0
        
        # Calculate bias score based on historical sequence analysis
        bias_score = self._calculate_bias_score(sequences, current_session)
        
        # Simple bias-based prediction: use bias as main indicator
        # Higher bias score = higher moonshot probability
        if bias_score > 0.5:
            # Historical-distribution target: lean on the realized peak
            # distribution of logged sequences, tilting toward the best peak
            # by how strongly the bias exceeds the prediction gate.
            peaks = sorted(float(s["peak_multiplier"]) for s in sequences)
            historical_target = statistics.median(peaks)
            bias_tilt = min(1.0, (bias_score - 0.5) * 2.0)          # 0 at gate, 1.0 max
            predicted_multiplier = historical_target + bias_tilt * (max(peaks) - historical_target)
            if current_last > historical_target:
                predicted_multiplier = max(
                    predicted_multiplier,
                    min(max(peaks), current_last * (1.0 + bias_score * 0.5)),
                )
            predicted_multiplier = round(max(1.0, predicted_multiplier), 2)

            return {
                "predicted": True,
                "confidence": round(bias_score, 4),
                "predicted_multiplier": predicted_multiplier,
                "predicted_range": {
                    "lo": round(max(1.0, self.base_threshold), 2),
                    "hi": predicted_multiplier,
                },
                "weighted_growth_rate": round(bias_score, 4),  # Use bias as growth rate
                "current_multiplier": round(current_last, 2),
                "threshold_used": self.extended_threshold,
                "scale_factor": self.filtering_scale,
                "historical_target": round(historical_target, 2),
                "peaks_used": len(peaks),
                "basis": f"median of {len(peaks)} historical sequence peaks "
                         f"({min(peaks):.1f}x-{max(peaks):.1f}x) tilted by bias {bias_score:.2f}",
                "reason": f"Bias-based prediction (score: {bias_score:.2f})"
            }
        else:
            return {
                "predicted": False,
                "confidence": round(bias_score, 4),
                "weighted_growth_rate": round(bias_score, 4),
                "current_multiplier": round(current_last, 2),
                "threshold_used": self.extended_threshold,
                "scale_factor": self.filtering_scale,
                "reason": f"Bias score too low ({bias_score:.2f})"
            }
    
    def _calculate_bias_score(
        self,
        sequences: List[Dict[str, Any]],
        current_session: List[Dict[str, Any]]
    ) -> float:
        """Calculate bias score from historical sequences and current session.
        
        Args:
            sequences: Historical moonshot sequences
            current_session: Current session rounds
            
        Returns:
            Bias score (0-1)
        """
        current_multipliers = [r["multiplier"] for r in current_session]
        current_avg = sum(current_multipliers) / len(current_multipliers) if current_multipliers else 0.0

        # Calculate bias from historical sequence patterns using log-ratio
        # growth for symmetry.  The old formula (growth_rate + 1) / 2
        # asymmetrically clamped: upward moves hit the ceiling at 1.0 while
        # downward moves produced low bias near 0.  Log-ratios are symmetric
        # (log(2) ≈ +0.69, log(0.5) ≈ −0.69), and the sigmoid maps them
        # smoothly into [0, 1] with 0.5 at no-growth.
        sequence_biases = []
        for seq in sequences:
            multipliers = seq.get("multipliers", [])
            if len(multipliers) >= 2:
                log_growth_rates = []
                for i in range(1, len(multipliers)):
                    if multipliers[i - 1] > 0:
                        log_growth_rates.append(
                            math.log(multipliers[i] / multipliers[i - 1])
                        )
                if log_growth_rates:
                    avg_log_growth = sum(log_growth_rates) / len(log_growth_rates)
                    # Sigmoid transform: log_growth=0 → 0.5, +1 → 0.73, −1 → 0.27
                    bias = 1.0 / (1.0 + math.exp(-avg_log_growth))
                    sequence_biases.append(bias)

        if not sequence_biases:
            return 0.5  # Neutral prior when no historical data

        # Average bias from historical sequences
        avg_historical_bias = sum(sequence_biases) / len(sequence_biases)

        # Calculate current session bias from multipliers
        # Higher multipliers = higher bias
        current_bias = min(1.0, current_avg / 20.0) if current_avg > 0 else 0.5

        # Blend historical and current bias
        final_bias = (avg_historical_bias * 0.6) + (current_bias * 0.4)

        return round(final_bias, 4)


def analyze_moonshot_sequences(
    rounds: Sequence[Dict[str, Any]],
    settings: cfg.AnalysisSettings,
    gap_seconds: int = 300,
    scale_factor: float = 1.0
) -> Dict[str, Any]:
    """Analyze moonshot sequences from rounds using session-based filtering.
    
    Args:
        rounds: Historical rounds to analyze
        settings: Analysis settings
        gap_seconds: Time gap in seconds to split sessions
        scale_factor: Threshold multiplier (1.0 = 10x threshold, 0.5 = 5x threshold)
                     Lower values = more comprehensive (include lower multipliers)
        
    Returns:
        Complete analysis with deduced sequences and predictions
    """
    from .analysis import split_sessions
    
    # Split rounds into sessions
    sessions = split_sessions(rounds, gap_seconds)
    
    if not sessions:
        return {
            "status": "error",
            "error": "No sessions found in rounds",
            "sessions_count": 0
        }
    
    # Initialize predictor
    predictor = MoonshotSequencePredictor(settings)
    
    # Deduce moonshot sequences with specified scaling
    sequences = predictor.deduce_moonshot_sequences(sessions, scale_factor=scale_factor)
    
    if not sequences:
        return {
            "status": "success",
            "sessions_count": len(sessions),
            "sequences_found": 0,
            "message": "No moonshot sequences found with current threshold"
        }
    
    # Get current session for prediction
    current_session = sessions[-1] if sessions else []
    
    # Generate prediction
    prediction = predictor.predict_next_moonshot(sequences, current_session)
    
    # Aggregate sequence statistics
    total_moonshots = sum(seq["moonshot_count"] for seq in sequences)
    avg_moonshots_per_session = total_moonshots / len(sequences) if sequences else 0.0
    peak_multiplier = max(seq["peak_multiplier"] for seq in sequences) if sequences else 0.0
    
    return {
        "status": "success",
        "sessions_count": len(sessions),
        "sequences_found": len(sequences),
        "total_moonshots": total_moonshots,
        "avg_moonshots_per_session": round(avg_moonshots_per_session, 2),
        "peak_multiplier": round(peak_multiplier, 2),
        "sequences": sequences,
        "prediction": prediction,
        "filtering_threshold": predictor.extended_threshold,
        "scale_factor": predictor.filtering_scale
    }