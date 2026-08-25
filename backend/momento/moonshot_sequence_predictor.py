"""Moonshot sequence prediction based on filtering rounds in sessions.

This module implements prediction based on moonshot sequences deduced by filtering
rounds in sessions, scaled to 10x+ to ensure all moonshots are known in sequence.
"""

import logging
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
        # Extended threshold for comprehensive filtering (10x+)
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
            scale_factor: Threshold multiplier (default 1.0 = 10x threshold)
                         scale_factor=1.0 gives 10x threshold, scale_factor=0.5 gives 5x threshold
                         Lower values = more comprehensive (include lower multipliers)
            
        Returns:
            List of deduced moonshot sequences with metadata
        """
        sequences = []
        
        for session_idx, session in enumerate(sessions):
            # Calculate threshold: base_threshold (10x) multiplied by scale_factor
            # scale_factor=1.0 gives 10x threshold, scale_factor=0.5 gives 5x threshold
            # For "10x+" comprehensiveness, we use scale_factor=1.0 (10x threshold)
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
            import statistics
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
        """Predict next moonshot based on deduced sequences.
        
        Args:
            sequences: Historical moonshot sequences
            current_session: Current session rounds
            
        Returns:
            Prediction with confidence and expected moonshot properties
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
        
        # Analyze current session state
        current_multipliers = [r["multiplier"] for r in current_session]
        current_peak = max(current_multipliers) if current_multipliers else 0.0
        current_avg = sum(current_multipliers) / len(current_multipliers) if current_multipliers else 0.0
        
        # Find similar historical sequences
        similar_sequences = self._find_similar_sequences(sequences, current_session)
        
        if not similar_sequences:
            return {
                "predicted": False,
                "confidence": 0.0,
                "reason": "No similar historical sequences found"
            }
        
        # Aggregate predictions from similar sequences
        prediction = self._aggregate_sequence_predictions(similar_sequences, current_session)
        
        logger.info(f"Generated moonshot prediction with confidence {prediction['confidence']}")
        return prediction
    
    def _find_similar_sequences(
        self,
        sequences: List[Dict[str, Any]],
        current_session: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Find historical sequences similar to current session."""
        current_multipliers = [r["multiplier"] for r in current_session]
        current_avg = sum(current_multipliers) / len(current_multipliers) if current_multipliers else 0.0
        current_peak = max(current_multipliers) if current_multipliers else 0.0
        
        similar_sequences = []
        
        for seq in sequences:
            # Compare session characteristics
            avg_diff = abs(seq["avg_multiplier"] - current_avg) / max(1.0, current_avg)
            peak_diff = abs(seq["peak_multiplier"] - current_peak) / max(1.0, current_peak)
            
            # Similarity score (lower is more similar)
            similarity_score = (avg_diff * 0.6) + (peak_diff * 0.4)
            
            # Threshold for similarity (adjustable)
            if similarity_score < 0.5:  # Within 50% similarity
                seq_copy = seq.copy()
                seq_copy["similarity_score"] = round(similarity_score, 4)
                similar_sequences.append(seq_copy)
        
        # Sort by similarity (most similar first)
        similar_sequences.sort(key=lambda x: x["similarity_score"])
        
        # Return top 5 most similar sequences
        return similar_sequences[:5]
    
    def _aggregate_sequence_predictions(
        self,
        similar_sequences: List[Dict[str, Any]],
        current_session: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Aggregate predictions from similar sequences."""
        if not similar_sequences:
            return {
                "predicted": False,
                "confidence": 0.0,
                "reason": "No similar sequences to aggregate"
            }
        
        # Calculate weighted average based on similarity
        total_weight = sum(1.0 - seq["similarity_score"] for seq in similar_sequences)
        
        # Predict next multiplier based on sequence growth patterns
        current_multipliers = [r["multiplier"] for r in current_session]
        current_last = current_multipliers[-1] if current_multipliers else 1.0
        
        # Aggregate growth rates
        weighted_growth = 0.0
        for seq in similar_sequences:
            weight = (1.0 - seq["similarity_score"]) / total_weight
            growth = seq["sequence_growth"]["growth_rate"]
            weighted_growth += growth * weight
        
        # Predict next moonshot multiplier
        predicted_multiplier = current_last * (1.0 + weighted_growth)
        predicted_multiplier = max(self.extended_threshold, predicted_multiplier)
        
        # Calculate confidence based on similarity and sequence count
        avg_similarity = sum(seq["similarity_score"] for seq in similar_sequences) / len(similar_sequences)
        confidence = (1.0 - avg_similarity) * 0.7 + (len(similar_sequences) / 5.0) * 0.3
        confidence = min(0.95, max(0.1, confidence))
        
        # Estimate rounds until next moonshot
        avg_rounds_between = []
        for seq in similar_sequences:
            if seq["rounds_between_moonshots"]:
                avg_rounds_between.extend(seq["rounds_between_moonshots"])
        
        estimated_rounds = int(sum(avg_rounds_between) / len(avg_rounds_between)) if avg_rounds_between else 10
        
        return {
            "predicted": True,
            "confidence": round(confidence, 4),
            "predicted_multiplier": round(predicted_multiplier, 2),
            "estimated_rounds_until": estimated_rounds,
            "similar_sequences_count": len(similar_sequences),
            "weighted_growth_rate": round(weighted_growth, 4),
            "current_multiplier": round(current_last, 2),
            "threshold_used": self.extended_threshold,
            "scale_factor": self.filtering_scale,
            "reason": f"Based on {len(similar_sequences)} similar historical sequences"
        }


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