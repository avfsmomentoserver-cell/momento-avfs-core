"""Analysis engine — statistics, ladders, resistance, streaks, regimes.

Every function here is pure: it takes a list of rounds (oldest first) and
returns plain dictionaries. No database access, no I/O, so the whole engine is
trivially testable and reusable by the forecast engine and the plugins.
"""

from __future__ import annotations

import logging
import math
import statistics
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence, Tuple

from .config import AnalysisSettings
from . import linguistics as ling

logger = logging.getLogger(__name__)

# Import new features
try:
    from features.pressure.detector import CeilingDetector
    from features.pressure.calculator import PressureCalculator
    from features.pressure.metrics import PressureMetrics
    from features.equal_baseline.converter import MultiplierConverter
    from features.equal_baseline.trendlines import TrendlineComputer
    from features.moonshot_scanner.linguistics import MoonshotLinguistics
    from features.moonshot_scanner.scanner import MoonshotScanner
    from features.band_analysis.ladders import LadderDetector
    from features.band_analysis.relativity import BandRelativity
    FEATURES_AVAILABLE = True
except ImportError:
    FEATURES_AVAILABLE = False

# Import alert manager
try:
    from .feature_alerts import alert_manager
    ALERTS_AVAILABLE = True
except ImportError:
    ALERTS_AVAILABLE = False


Round = Dict[str, Any]


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _multipliers(rounds: Sequence[Round]) -> List[float]:
    return [float(r["multiplier"]) for r in rounds]


def _parse_ts(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if not value:
        return None
    text = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _safe_mean(values: Sequence[float]) -> float:
    return round(statistics.fmean(values), 4) if values else 0.0


def _safe_stdev(values: Sequence[float]) -> float:
    return round(statistics.pstdev(values), 4) if len(values) > 1 else 0.0


def percentile(values: Sequence[float], pct: float) -> float:
    """Linear-interpolated empirical percentile (pct in 0..100)."""
    if not values:
        return 0.0
    ordered = sorted(float(v) for v in values)
    if len(ordered) == 1:
        return round(ordered[0], 4)
    rank = (pct / 100.0) * (len(ordered) - 1)
    low = math.floor(rank)
    high = math.ceil(rank)
    if low == high:
        return round(ordered[int(rank)], 4)
    weight = rank - low
    return round(ordered[low] * (1 - weight) + ordered[high] * weight, 4)


def robust_percentiles(values: Sequence[float]) -> Dict[str, float]:
    """Percentile ladder used by the prediction range and the charts."""
    return {
        "p05": percentile(values, 5),
        "p10": percentile(values, 10),
        "p25": percentile(values, 25),
        "p50": percentile(values, 50),
        "p75": percentile(values, 75),
        "p90": percentile(values, 90),
        "p95": percentile(values, 95),
        "p99": percentile(values, 99),
    }


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return round(max(lo, min(hi, value)), 4)


# ---------------------------------------------------------------------------
# sessions
# ---------------------------------------------------------------------------

def split_sessions(rounds: Sequence[Round], gap_seconds: int) -> List[List[Round]]:
    """Group chronologically ordered rounds into continuous play sessions."""
    sessions: List[List[Round]] = []
    current: List[Round] = []
    previous: Optional[datetime] = None

    for entry in rounds:
        stamp = _parse_ts(entry.get("timestamp"))
        if previous is not None and stamp is not None:
            if (stamp - previous).total_seconds() > gap_seconds:
                sessions.append(current)
                current = []
        current.append(entry)
        if stamp is not None:
            previous = stamp

    if current:
        sessions.append(current)
    return sessions


def session_summary(rounds: Sequence[Round], gap_seconds: int) -> Dict[str, Any]:
    sessions = split_sessions(rounds, gap_seconds)
    active = sessions[-1] if sessions else []
    multipliers = _multipliers(active)
    stamps = [s for s in (_parse_ts(r.get("timestamp")) for r in active) if s is not None]

    duration = 0.0
    if len(stamps) > 1:
        duration = (max(stamps) - min(stamps)).total_seconds()
    avg_round = round(duration / max(1, len(active) - 1), 2) if len(active) > 1 else 0.0

    log_values = [math.log(max(1.01, m)) for m in multipliers]
    return {
        "active": len(active) > 0,
        "rounds_available": len(rounds),
        "count": len(active),
        "sessions_total": len(sessions),
        "avg_round_secs": avg_round,
        "duration_secs": round(duration, 1),
        "started_at": min(stamps).isoformat() if stamps else None,
        "ended_at": max(stamps).isoformat() if stamps else None,
        "peak": round(max(multipliers), 2) if multipliers else 0.0,
        "mean": _safe_mean(multipliers),
        "median": percentile(multipliers, 50),
        "volatility": _safe_stdev(log_values),
    }


# ---------------------------------------------------------------------------
# streaks
# ---------------------------------------------------------------------------

def detect_streaks(multipliers: Sequence[float], threshold: float) -> Dict[str, Any]:
    """Runs of consecutive rounds under / over the low-band threshold."""
    if not multipliers:
        return {
            "current_low_streak": 0,
            "current_high_streak": 0,
            "longest_low_streak": 0,
            "longest_high_streak": 0,
            "threshold": threshold,
            "runs": [],
        }

    runs: List[Dict[str, Any]] = []
    kind = "low" if multipliers[0] < threshold else "high"
    length = 1
    for value in multipliers[1:]:
        this_kind = "low" if value < threshold else "high"
        if this_kind == kind:
            length += 1
        else:
            runs.append({"kind": kind, "length": length})
            kind = this_kind
            length = 1
    runs.append({"kind": kind, "length": length})

    lows = [r["length"] for r in runs if r["kind"] == "low"]
    highs = [r["length"] for r in runs if r["kind"] == "high"]
    last = runs[-1]

    return {
        "current_low_streak": last["length"] if last["kind"] == "low" else 0,
        "current_high_streak": last["length"] if last["kind"] == "high" else 0,
        "longest_low_streak": max(lows) if lows else 0,
        "longest_high_streak": max(highs) if highs else 0,
        "avg_low_streak": _safe_mean(lows),
        "avg_high_streak": _safe_mean(highs),
        "threshold": threshold,
        "runs": runs[-40:],
    }


# ---------------------------------------------------------------------------
# ladders
# ---------------------------------------------------------------------------

def ascending_ladder(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """Rising floor detection — each round holds above the previous floor."""
    if len(multipliers) < 2:
        return {"active": False, "length": 0, "floor": 0.0, "pressure": 0.0, "strength": 0.0, "slope": 0.0}

    points = [ling.to_points(m) for m in multipliers]
    length = 1
    floor = points[-1]
    tolerance = settings.ladder_tolerance * 100.0

    for index in range(len(points) - 2, -1, -1):
        if points[index] <= floor + tolerance:
            length += 1
            floor = min(floor, points[index])
        else:
            break

    window = points[-length:]
    slope = 0.0
    if length > 1:
        slope = round((window[-1] - window[0]) / (length - 1), 3)

    active = length >= settings.ladder_min_length and slope > 0
    pressure = clamp(length / 12.0) if active else clamp(length / 24.0)
    strength = clamp((pressure * 0.6) + (clamp(slope / 20.0) * 0.4))

    return {
        "active": active,
        "length": length,
        "floor": ling.from_points(floor),
        "floor_points": round(floor, 2),
        "pressure": pressure,
        "strength": strength,
        "slope": slope,
    }


def collapse_ladder(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """Descending ceiling detection — each round fails lower than the last."""
    if len(multipliers) < 2:
        return {"active": False, "run": 0, "ceiling": 0.0, "strength": 0.0, "breakout_pct": 0.0}

    points = [ling.to_points(m) for m in multipliers]
    run = 1
    ceiling = points[-1]
    for index in range(len(points) - 2, -1, -1):
        if points[index] >= ceiling:
            run += 1
            ceiling = max(ceiling, points[index])
        else:
            break

    active = run >= settings.collapse_min_length
    strength = clamp(run / 10.0)
    ceiling_mult = ling.from_points(ceiling)
    last = multipliers[-1]
    breakout_pct = clamp(((ceiling_mult - last) / max(0.01, ceiling_mult)), 0.0, 1.0)

    return {
        "active": active,
        "run": run,
        "ceiling": round(ceiling_mult, 2),
        "ceiling_points": round(ceiling, 2),
        "strength": strength,
        "breakout_pct": breakout_pct,
    }


def find_release_conditions(
    multipliers: Sequence[float],
    settings: AnalysisSettings
) -> Dict[str, Any]:
    """Find release condition patterns, specifically longest ladders leading to moonshots.
    
    Args:
        multipliers: Sequence of multiplier values
        settings: Analysis settings
        
    Returns:
        Dictionary with release condition analysis
    """
    if len(multipliers) < 10:
        return {
            "longest_ladder_moonshot_correlation": 0.0,
            "release_conditions": [],
            "moonshot_probability": 0.0,
            "eta_to_moonshot": 0
        }
    
    # Detect ladders
    ladders = ling.detect_ladders(multipliers, min_length=4)
    
    if not ladders:
        return {
            "longest_ladder_moonshot_correlation": 0.0,
            "release_conditions": [],
            "moonshot_probability": 0.0,
            "eta_to_moonshot": 0
        }
    
    # Find moonshots (multipliers >= 20)
    moonshot_indices = [i for i, m in enumerate(multipliers) if m >= 20.0]
    
    # Get longest ladders (top 10% by length, minimum 10 rounds)
    min_long_length = 10
    sorted_ladders = sorted(ladders, key=lambda l: l.length, reverse=True)
    longest_ladders = [l for l in sorted_ladders if l.length >= min_long_length]
    
    if not longest_ladders:
        longest_ladders = sorted_ladders[:max(1, len(sorted_ladders) // 10)]
    
    # Analyze longest ladders for moonshot correlation
    release_conditions = []
    moonshot_correlations = 0
    
    for ladder in longest_ladders:
        # Check if moonshot occurs within 15 rounds after ladder ends
        window_end = min(len(multipliers), ladder.end_index + 15)
        moonshot_in_window = any(i in moonshot_indices for i in range(ladder.end_index + 1, window_end))
        
        if moonshot_in_window:
            # Find the first moonshot after ladder
            first_moonshot_idx = None
            for i in range(ladder.end_index + 1, window_end):
                if i in moonshot_indices:
                    first_moonshot_idx = i
                    break
            
            if first_moonshot_idx:
                eta = first_moonshot_idx - ladder.end_index
                moonshot_correlations += 1
                release_conditions.append({
                    "ladder_type": ladder.ladder_type,
                    "ladder_length": ladder.length,
                    "ladder_start": ladder.start_index,
                    "ladder_end": ladder.end_index,
                    "moonshot_index": first_moonshot_idx,
                    "eta_rounds": eta,
                    "moonshot_multiplier": multipliers[first_moonshot_idx],
                    "ladder_slope": ladder.slope,
                    "ladder_strength": ladder.strength
                })
    
    # Calculate correlation rate
    correlation_rate = moonshot_correlations / len(longest_ladders) if longest_ladders else 0.0
    
    # Calculate moonshot probability based on current conditions
    current_ladders = [l for l in ladders if l.end_index == len(multipliers) - 1]
    if current_ladders:
        current_longest = max(current_ladders, key=lambda l: l.length)
        # If current ladder is long, increase moonshot probability
        if current_longest.length >= min_long_length:
            moonshot_probability = 0.6 + (current_longest.length * 0.02)  # Base 60% + 2% per round
            moonshot_probability = min(0.95, moonshot_probability)
        else:
            moonshot_probability = 0.3
    else:
        moonshot_probability = 0.2
    
    # Estimate ETA to moonshot based on historical patterns
    if release_conditions:
        avg_eta = sum(rc["eta_rounds"] for rc in release_conditions) / len(release_conditions)
    else:
        avg_eta = 10  # Default estimate
    
    return {
        "longest_ladder_moonshot_correlation": round(correlation_rate, 4),
        "release_conditions": release_conditions,
        "moonshot_probability": round(moonshot_probability, 4),
        "eta_to_moonshot": round(avg_eta, 2),
        "longest_ladders_count": len(longest_ladders),
        "min_long_ladder_length": min_long_length,
        "current_longest_ladder": {
            "length": max(l.length for l in current_ladders) if current_ladders else 0,
            "type": max(current_ladders, key=lambda l: l.length).ladder_type if current_ladders else None
        } if current_ladders else None
    }


def ladder_dna_analysis(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """Combine ladder patterns with DNA signatures for enhanced pattern matching.
    
    Args:
        multipliers: Sequence of multiplier values
        settings: Analysis settings
        
    Returns:
        Dictionary with ladder-enhanced DNA analysis
    """
    if len(multipliers) < settings.dna_window:
        return {
            "ladder_dna_signature": [],
            "ladder_enhanced_matches": 0,
            "ladder_to_outcome_correlation": {},
            "combined_confidence": 0.0
        }
    
    # Get DNA signature
    dna_sig = dna_signature(multipliers, settings)
    
    # Detect ladders
    ladders = ling.detect_ladders(multipliers, min_length=4)
    
    # Create ladder-enhanced DNA signature
    ladder_dna = []
    for i, band in enumerate(dna_sig):
        # Check if this position is part of a ladder
        in_ladder = False
        ladder_info = None
        for ladder in ladders:
            if ladder.start_index <= i <= ladder.end_index:
                in_ladder = True
                ladder_info = {
                    "type": ladder.ladder_type,
                    "strength": ladder.strength,
                    "position_in_ladder": i - ladder.start_index,
                    "ladder_length": ladder.length
                }
                break
        
        ladder_dna.append({
            "band": band,
            "in_ladder": in_ladder,
            "ladder_info": ladder_info
        })
    
    # Calculate ladder-to-outcome correlation
    ladder_to_outcome = {}
    for ladder in ladders:
        if ladder.end_index + 1 < len(multipliers):
            next_multiplier = multipliers[ladder.end_index + 1]
            next_band = ling.band_for(next_multiplier)["key"]
            ladder_to_outcome[f"{ladder.ladder_type}_{ladder.length}"] = {
                "next_band": next_band,
                "next_multiplier": next_multiplier,
                "gap": ladder.end_index + 1 - ladder.start_index
            }
    
    # Calculate combined confidence (ladder presence + DNA match)
    ladder_count = len(ladders)
    dna_variety = len(set(dna_sig))
    combined_confidence = min(1.0, (ladder_count * 0.3) + (dna_variety * 0.1))
    
    return {
        "ladder_dna_signature": ladder_dna,
        "ladder_enhanced_matches": ladder_count,
        "ladder_to_outcome_correlation": ladder_to_outcome,
        "combined_confidence": combined_confidence,
        "ladder_summary": {
            "total_ladders": ladder_count,
            "ascend_count": sum(1 for l in ladders if l.ladder_type == "ascend"),
            "collapse_count": sum(1 for l in ladders if l.ladder_type == "collapse"),
            "avg_length": sum(l.length for l in ladders) / ladder_count if ladder_count else 0
        }
    }


def nested_bands(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """Nested compression — the window narrows round after round."""
    window = list(multipliers)[-settings.shelf_window :]
    if len(window) < 4:
        return {"detected": False, "slope": 0.0, "rounds": len(window), "compression": 0.0}

    points = [ling.to_points(m) for m in window]
    halves = len(points) // 2
    early_spread = max(points[:halves]) - min(points[:halves])
    late_spread = max(points[halves:]) - min(points[halves:])
    compression = clamp((early_spread - late_spread) / max(1.0, early_spread))

    n = len(points)
    mean_x = (n - 1) / 2
    mean_y = sum(points) / n
    denom = sum((i - mean_x) ** 2 for i in range(n)) or 1.0
    slope = round(sum((i - mean_x) * (points[i] - mean_y) for i in range(n)) / denom, 3)

    return {
        "detected": compression > 0.35 and late_spread < 25,
        "slope": slope,
        "rounds": n,
        "compression": compression,
        "early_spread": round(early_spread, 2),
        "late_spread": round(late_spread, 2),
    }


def shelf_signal(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """Flat-variance shelf — the market coils inside a tight band."""
    window = list(multipliers)[-settings.shelf_window :]
    if len(window) < 5:
        return {"active": False, "variance": 0.0, "strength": 0.0, "level": 0.0, "rounds": len(window)}

    points = [ling.to_points(m) for m in window]
    variance = round(statistics.pstdev(points), 3)
    normalized = variance / 100.0
    active = normalized <= settings.shelf_variance / 2
    return {
        "active": active,
        "variance": variance,
        "normalized_variance": round(normalized, 4),
        "strength": clamp(1.0 - normalized * 3.0),
        "level": round(ling.from_points(statistics.fmean(points)), 2),
        "rounds": len(window),
    }


def bait_signal(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """A lone spike surrounded by weakness — a false invitation."""
    window = list(multipliers)[-8:]
    if len(window) < 5:
        return {"active": False, "strength": 0.0, "spike": 0.0, "context_mean": 0.0}

    spike = max(window)
    others = [m for m in window if m != spike] or [1.0]
    context_mean = statistics.fmean(others)
    ratio = spike / max(1.0, context_mean)
    lows = sum(1 for m in others if m < settings.low_band_threshold)
    active = ratio >= settings.bait_spike_ratio and lows >= len(others) * 0.6

    return {
        "active": active,
        "strength": clamp((ratio - 1.0) / 5.0) if active else clamp((ratio - 1.0) / 12.0),
        "spike": round(spike, 2),
        "context_mean": round(context_mean, 3),
        "ratio": round(ratio, 3),
        "weak_neighbours": lows,
    }


# ---------------------------------------------------------------------------
# resistance / ceiling
# ---------------------------------------------------------------------------

def resistance_levels(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """Cluster local maxima into resistance zones in point space."""
    if len(multipliers) < 8:
        return {"levels": [], "recently_cleared": 0, "nearest": None, "pressure": 0.0}

    points = [ling.to_points(m) for m in multipliers]
    peaks = [
        points[i]
        for i in range(1, len(points) - 1)
        if points[i] >= points[i - 1] and points[i] >= points[i + 1]
    ]
    if not peaks:
        peaks = [max(points)]

    lo, hi = min(peaks), max(peaks)
    span = max(1.0, hi - lo)
    bin_count = max(4, min(settings.resistance_bins, len(peaks)))
    width = span / bin_count

    buckets: Dict[int, List[float]] = {}
    for peak in peaks:
        index = min(bin_count - 1, int((peak - lo) / width))
        buckets.setdefault(index, []).append(peak)

    total = len(peaks)
    levels: List[Dict[str, Any]] = []
    for index, values in sorted(buckets.items()):
        center = statistics.fmean(values)
        levels.append(
            {
                "points": round(center, 2),
                "multiplier": round(ling.from_points(center), 2),
                "touches": len(values),
                "weight": round(len(values) / total, 4),
                "band": ling.band_label(ling.from_points(center)),
            }
        )

    levels.sort(key=lambda level: level["touches"], reverse=True)
    levels = levels[:8]

    current = points[-1]
    above = [level for level in levels if level["points"] > current]
    above.sort(key=lambda level: level["points"])
    nearest = above[0] if above else None

    recent = points[-10:]
    recently_cleared = 0
    for level in levels:
        if any(value > level["points"] for value in recent):
            recently_cleared += 1

    pressure = 0.0
    if nearest is not None:
        distance = nearest["points"] - current
        pressure = clamp(1.0 - (distance / 60.0)) * float(nearest["weight"]) * 2
        pressure = clamp(pressure)

    return {
        "levels": levels,
        "recently_cleared": recently_cleared,
        "nearest": nearest,
        "pressure": pressure,
        "current_points": round(current, 2),
    }


def band_exhaustion(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """Per-band cadence: expected gap vs actual gap since the last hit."""
    total = len(multipliers)
    if total < 10:
        return {"bands": [], "most_overdue": None}

    out: List[Dict[str, Any]] = []
    for threshold in ling.DISTRIBUTION_THRESHOLDS[1:]:
        hit_indexes = [i for i, m in enumerate(multipliers) if m >= threshold]
        hits = len(hit_indexes)
        rate = hits / total
        expected_gap = round(1.0 / rate, 2) if rate > 0 else None
        since = total - 1 - hit_indexes[-1] if hit_indexes else total

        gaps: List[int] = []
        for a, b in zip(hit_indexes, hit_indexes[1:]):
            gaps.append(b - a)

        overdue_ratio = 0.0
        if expected_gap:
            overdue_ratio = round(since / expected_gap, 3)

        out.append(
            {
                "threshold": threshold,
                "label": f"{int(threshold)}x",
                "hits": hits,
                "rate": round(rate, 4),
                "expected_gap": expected_gap,
                "observed_gap": _safe_mean(gaps) if gaps else None,
                "rounds_since": since,
                "overdue_ratio": overdue_ratio,
                "exhaustion": clamp(overdue_ratio / 2.5),
                "status": "overdue" if overdue_ratio > 1.25 else ("due" if overdue_ratio > 0.85 else "fresh"),
            }
        )

    ranked = [b for b in out if b["expected_gap"]]
    ranked.sort(key=lambda b: b["overdue_ratio"], reverse=True)
    return {"bands": out, "most_overdue": ranked[0] if ranked else None}


def gap_swing(multipliers: Sequence[float]) -> Dict[str, Any]:
    """Gap / swing analyzer — round-over-round deltas in point space."""
    if len(multipliers) < 4:
        return {"gaps": [], "mean_gap": 0.0, "max_swing": 0.0, "direction": "flat", "swing_score": 0.0}

    points = [ling.to_points(m) for m in multipliers]
    gaps = [round(b - a, 2) for a, b in zip(points, points[1:])]
    recent = gaps[-20:]
    ups = [g for g in recent if g > 0]
    downs = [g for g in recent if g < 0]
    net = sum(recent)

    return {
        "gaps": recent,
        "mean_gap": _safe_mean(recent),
        "mean_up": _safe_mean(ups),
        "mean_down": _safe_mean(downs),
        "max_swing": round(max((abs(g) for g in recent), default=0.0), 2),
        "net": round(net, 2),
        "direction": "up" if net > 6 else ("down" if net < -6 else "flat"),
        "swing_score": clamp(abs(net) / 90.0),
        "up_ratio": round(len(ups) / len(recent), 3) if recent else 0.0,
    }


# ---------------------------------------------------------------------------
# regime / house edge / DNA
# ---------------------------------------------------------------------------

def regime(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """Volatility regime from rolling log-return dispersion."""
    window = list(multipliers)[-settings.volatility_window :]
    if len(window) < 8:
        return {"regime": "warming-up", "confidence": 0.1, "volatility": 0.0, "drift": 0.0}

    logs = [math.log(max(1.01, m)) for m in window]
    volatility = statistics.pstdev(logs)
    drift = statistics.fmean(logs)

    if volatility < 0.45:
        label = "compressed"
    elif volatility < 0.85:
        label = "balanced"
    elif volatility < 1.35:
        label = "expanded"
    else:
        label = "chaotic"

    if drift > 0.95 and volatility > 0.8:
        label = "trending-up"
    elif drift < 0.45 and volatility < 0.7:
        label = "grinding-down"

    return {
        "regime": label,
        "confidence": clamp(len(window) / settings.volatility_window),
        "volatility": round(volatility, 4),
        "drift": round(drift, 4),
        "window": len(window),
    }


def house_edge(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """Estimate the operator edge.

    For a fair crash curve the survival function is P(M >= x) = (1 - h) / x.
    Fitting h across every threshold gives a stable, low-variance estimate.
    """
    total = len(multipliers)
    if total < 25:
        return {
            "estimate": settings.house_edge_prior,
            "confidence": 0.0,
            "samples": total,
            "instant_bust_rate": 0.0,
            "fits": [],
            "note": "Needs at least 25 rounds for a reliable fit.",
        }

    fits: List[Dict[str, Any]] = []
    estimates: List[float] = []
    for threshold in (1.5, 2.0, 3.0, 5.0, 10.0):
        survivors = sum(1 for m in multipliers if m >= threshold)
        observed = survivors / total
        implied = 1.0 - (observed * threshold)
        fits.append(
            {
                "threshold": threshold,
                "observed_survival": round(observed, 4),
                "fair_survival": round(1.0 / threshold, 4),
                "implied_edge": round(implied, 4),
            }
        )
        if -0.5 < implied < 0.6:
            estimates.append(implied)

    estimate = statistics.median(estimates) if estimates else settings.house_edge_prior
    instant_bust = sum(1 for m in multipliers if m < 1.01) / total
    expected_rtp = round((1.0 - estimate) * 100, 2)

    return {
        "estimate": round(estimate, 4),
        "estimate_pct": round(estimate * 100, 2),
        "expected_rtp_pct": expected_rtp,
        "confidence": clamp(total / 500.0),
        "samples": total,
        "instant_bust_rate": round(instant_bust, 4),
        "fits": fits,
    }


def dna_signature(multipliers: Sequence[float], settings: AnalysisSettings) -> List[str]:
    """Encode the recent window as a band-key signature ('DNA')."""
    window = list(multipliers)[-settings.dna_window :]
    return [ling.band_for(m)["key"] for m in window]


def dna_report(multipliers: Sequence[float], settings: AnalysisSettings) -> Dict[str, Any]:
    """Find historical windows matching the current DNA and score what followed."""
    window_size = settings.dna_window
    if len(multipliers) < window_size * 3:
        return {
            "signature": dna_signature(multipliers, settings),
            "matches": [],
            "match_count": 0,
            "outcomes": {},
            "confidence": 0.0,
            "note": "Not enough history for DNA matching yet.",
        }

    signature = dna_signature(multipliers, settings)
    keys = [ling.band_for(m)["key"] for m in multipliers]
    index_of = {key: i for i, key in enumerate(ling.BAND_KEYS)}
    target = [index_of[k] for k in signature]

    matches: List[Dict[str, Any]] = []
    limit = len(multipliers) - window_size * 2
    for start in range(max(0, limit)):
        candidate = [index_of[k] for k in keys[start : start + window_size]]
        distance = sum(abs(a - b) for a, b in zip(candidate, target))
        similarity = 1.0 - (distance / (window_size * (len(ling.BAND_KEYS) - 1)))
        if similarity >= settings.dna_tolerance:
            follow_index = start + window_size
            if follow_index < len(multipliers):
                matches.append(
                    {
                        "index": start,
                        "similarity": round(similarity, 4),
                        "next_multiplier": round(multipliers[follow_index], 2),
                        "next_band": ling.band_label(multipliers[follow_index]),
                        "signature": keys[start : start + window_size],
                    }
                )

    matches.sort(key=lambda m: m["similarity"], reverse=True)
    followers = [m["next_multiplier"] for m in matches]

    outcomes: Dict[str, Any] = {}
    if followers:
        outcomes = {
            "count": len(followers),
            "mean": _safe_mean(followers),
            "median": percentile(followers, 50),
            "p75": percentile(followers, 75),
            "p90": percentile(followers, 90),
            "over_2x": round(sum(1 for f in followers if f >= 2) / len(followers), 4),
            "over_5x": round(sum(1 for f in followers if f >= 5) / len(followers), 4),
            "over_10x": round(sum(1 for f in followers if f >= 10) / len(followers), 4),
        }

    return {
        "signature": signature,
        "signature_labels": [ling.band_for(m)["label"] for m in list(multipliers)[-window_size:]],
        "matches": matches[:24],
        "match_count": len(matches),
        "outcomes": outcomes,
        "confidence": clamp(len(matches) / 25.0),
        "tolerance": settings.dna_tolerance,
    }


# ---------------------------------------------------------------------------
# state machine
# ---------------------------------------------------------------------------

def compute_prediction_metrics(predictions: List[Dict[str, Any]], actuals: List[float]) -> Dict[str, Any]:
    """Compute prediction metrics: precision, recall, F1, MAE, RMSE.
    
    Args:
        predictions: List of prediction dictionaries with 'predicted' and 'confidence'
        actuals: List of actual values
        
    Returns:
        Dictionary with prediction metrics
    """
    if not predictions or not actuals or len(predictions) != len(actuals):
        return {
            "precision": 0.0,
            "recall": 0.0,
            "f1_score": 0.0,
            "mae": 0.0,
            "rmse": 0.0,
            "note": "Insufficient data for metrics calculation"
        }
    
    # Binary classification metrics (assuming threshold of 0.5)
    predicted_binary = [1 if p.get("predicted", 0) >= 0.5 else 0 for p in predictions]
    actual_binary = [1 if a >= 0.5 else 0 for a in actuals]
    
    true_positives = sum(1 for p, a in zip(predicted_binary, actual_binary) if p == 1 and a == 1)
    false_positives = sum(1 for p, a in zip(predicted_binary, actual_binary) if p == 1 and a == 0)
    false_negatives = sum(1 for p, a in zip(predicted_binary, actual_binary) if p == 0 and a == 1)
    
    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    # Regression metrics
    predicted_values = [p.get("predicted", 0) for p in predictions]
    mae = sum(abs(p - a) for p, a in zip(predicted_values, actuals)) / len(actuals)
    rmse = (sum((p - a) ** 2 for p, a in zip(predicted_values, actuals)) / len(actuals)) ** 0.5
    
    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1_score, 4),
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "true_positives": true_positives,
        "false_positives": false_positives,
        "false_negatives": false_negatives
    }


def compute_linguistic_metrics(linguistics: Dict[str, Any]) -> Dict[str, Any]:
    """Compute aggregate linguistic factor scores.
    
    Args:
        linguistics: Dictionary with linguistic factors
        
    Returns:
        Dictionary with aggregated linguistic metrics
    """
    if not linguistics:
        return {
            "overall_score": 0.0,
            "factor_contributions": {},
            "dominant_factor": None
        }
    
    # Extract individual factor scores
    factor_scores = {
        "pressure": linguistics.get("pressure", 0.0),
        "compression": linguistics.get("compression", 0.0),
        "ceiling_proximity": linguistics.get("ceiling_proximity", 0.0),
    }
    
    # Calculate momentum score from distance
    momentum_20x = linguistics.get("momentum_distance_20x", {})
    if momentum_20x.get("found", False):
        distance = momentum_20x.get("distance", 100)
        momentum_score = 1.0 / (distance / 20.0 + 1.0)
    else:
        momentum_score = 0.0
    factor_scores["momentum"] = momentum_score
    
    # Calculate band transition score
    band_data = linguistics.get("band_transition", {})
    band_trend = band_data.get("trend", "stable")
    band_score = 1.0 if band_trend == "upward" else (0.5 if band_trend == "mixed" else 0.0)
    factor_scores["band_transition"] = band_score
    
    # Calculate overall score (weighted average)
    weights = {
        "pressure": 0.3,
        "compression": 0.25,
        "ceiling_proximity": 0.2,
        "momentum": 0.15,
        "band_transition": 0.1
    }
    
    overall_score = sum(
        factor_scores[factor] * weights[factor] 
        for factor in factor_scores
    )
    
    # Find dominant factor
    dominant_factor = max(factor_scores, key=lambda k: factor_scores[k])
    
    # Calculate factor contributions (percentage of overall score)
    factor_contributions = {}
    for factor, score in factor_scores.items():
        contribution = (score * weights[factor]) / overall_score if overall_score > 0 else 0.0
        factor_contributions[factor] = round(contribution, 3)
    
    return {
        "overall_score": round(overall_score, 3),
        "factor_scores": {k: round(v, 3) for k, v in factor_scores.items()},
        "factor_contributions": factor_contributions,
        "dominant_factor": dominant_factor,
        "weights": weights
    }


def compute_calibration_metrics(confidences: List[float], outcomes: List[int]) -> Dict[str, Any]:
    """Compute calibration metrics for probability predictions.
    
    Args:
        confidences: List of predicted confidence values (0-1)
        outcomes: List of binary outcomes (0 or 1)
        
    Returns:
        Dictionary with calibration metrics
    """
    if not confidences or not outcomes or len(confidences) != len(outcomes):
        return {
            "calibration_error": 0.0,
            "brier_score": 0.0,
            "note": "Insufficient data for calibration"
        }
    
    # Brier score (mean squared error of probabilities)
    brier_score = sum((c - o) ** 2 for c, o in zip(confidences, outcomes)) / len(outcomes)
    
    # Calibration error (group by confidence bins)
    bins = [(0.0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.0)]
    calibration_errors = []
    
    for low, high in bins:
        # Find predictions in this bin
        bin_indices = [i for i, c in enumerate(confidences) if low <= c < high]
        
        if bin_indices:
            avg_confidence = sum(confidences[i] for i in bin_indices) / len(bin_indices)
            avg_outcome = sum(outcomes[i] for i in bin_indices) / len(bin_indices)
            calibration_errors.append(abs(avg_confidence - avg_outcome))
    
    mean_calibration_error = sum(calibration_errors) / len(calibration_errors) if calibration_errors else 0.0
    
    return {
        "calibration_error": round(mean_calibration_error, 4),
        "brier_score": round(brier_score, 4),
        "bin_calibrations": calibration_errors
    }


def classify_state(signals: Dict[str, Any], multipliers: Sequence[float], settings: AnalysisSettings) -> Tuple[str, Dict[str, float]]:
    """Score every state and return the winner plus the full score table."""
    if not multipliers:
        return "Normal", {state: 0.0 for state in ling.STATES}

    last = multipliers[-1]
    recent = list(multipliers)[-10:]
    high_hits = sum(1 for m in recent if m >= settings.moonshot_threshold)
    low_hits = sum(1 for m in recent if m < settings.low_band_threshold)

    asc = signals.get("ascending_ladder", {})
    col = signals.get("collapse_ladder", {})
    shelf = signals.get("shelf", {})
    bait = signals.get("bait", {})
    nested = signals.get("nested", {})

    scores: Dict[str, float] = {
        "Normal": 0.34,
        "Collapse": float(col.get("strength", 0.0)) * (1.25 if col.get("active") else 0.5),
        "Ignition": (float(asc.get("strength", 0.0)) * 0.7) + (float(nested.get("compression", 0.0)) * 0.55),
        "Moonshot": clamp(high_hits / 2.5) if last >= settings.ignition_threshold else clamp(high_hits / 6.0),
        "Exhaustion": 0.0,
        "Shelf": float(shelf.get("strength", 0.0)) * (1.2 if shelf.get("active") else 0.4),
        "Bait": float(bait.get("strength", 0.0)) * (1.3 if bait.get("active") else 0.35),
    }

    # Exhaustion: a big print already landed and the market is fading.
    peak_recent = max(recent)
    if peak_recent >= settings.moonshot_threshold and last < settings.low_band_threshold:
        scores["Exhaustion"] = clamp(0.55 + (low_hits / 14.0))
    elif peak_recent >= settings.ignition_threshold and last < settings.low_band_threshold:
        scores["Exhaustion"] = clamp(0.4 + (low_hits / 20.0))

    if last >= settings.moonshot_threshold:
        scores["Moonshot"] = clamp(scores["Moonshot"] + 0.45)
    if last >= settings.ignition_threshold:
        scores["Ignition"] = clamp(scores["Ignition"] + 0.2)
    if low_hits >= 7:
        scores["Collapse"] = clamp(scores["Collapse"] + 0.2)

    scores = {key: clamp(value) for key, value in scores.items()}
    winner = max(scores.items(), key=lambda item: item[1])[0]
    return winner, scores


def state_transitions(rounds: Sequence[Round], settings: AnalysisSettings) -> List[Dict[str, Any]]:
    """Walk the history and record every state change (for the timeline panel)."""
    multipliers = _multipliers(rounds)
    if len(multipliers) < 12:
        return []

    transitions: List[Dict[str, Any]] = []
    previous: Optional[str] = None
    step = max(1, len(multipliers) // 120)

    for end in range(10, len(multipliers) + 1, step):
        window = multipliers[max(0, end - 40) : end]
        signals = {
            "ascending_ladder": ascending_ladder(window, settings),
            "collapse_ladder": collapse_ladder(window, settings),
            "shelf": shelf_signal(window, settings),
            "bait": bait_signal(window, settings),
            "nested": nested_bands(window, settings),
        }
        state, _ = classify_state(signals, window, settings)
        if state != previous:
            entry = rounds[end - 1]
            transitions.append(
                {
                    "from": previous or "—",
                    "to": state,
                    "round_id": entry.get("id"),
                    "timestamp": entry.get("timestamp"),
                    "multiplier": round(float(entry["multiplier"]), 2),
                    "index": end - 1,
                }
            )
            previous = state

    return transitions[-30:]


def build_warnings(state: str, signals: Dict[str, Any], streaks: Dict[str, Any], exhaustion: Dict[str, Any], settings: AnalysisSettings) -> List[Dict[str, Any]]:
    """Operator-facing warnings, highest severity first."""
    warnings: List[Dict[str, Any]] = []

    if state == "Bait":
        warnings.append({"level": "high", "code": "bait_pattern", "message": "Bait spike detected — single high print inside a weak window."})
    if state == "Collapse":
        warnings.append({"level": "high", "code": "collapse_active", "message": "Collapse ladder active — ceilings stepping down."})
    if state == "Exhaustion":
        warnings.append({"level": "medium", "code": "post_spike_fade", "message": "Post-spike exhaustion — upside energy already spent."})

    low_streak = int(streaks.get("current_low_streak", 0))
    if low_streak >= 8:
        warnings.append({"level": "high", "code": "low_streak", "message": f"{low_streak} consecutive rounds under {settings.low_band_threshold:g}x."})
    elif low_streak >= 5:
        warnings.append({"level": "medium", "code": "low_streak", "message": f"{low_streak} low rounds in a row — floor pressure building."})

    nested = signals.get("nested", {})
    if nested.get("detected"):
        warnings.append({"level": "low", "code": "compression", "message": "Nested compression — expect a resolution move."})

    overdue = exhaustion.get("most_overdue")
    if overdue and float(overdue.get("overdue_ratio", 0)) > 1.6:
        warnings.append({"level": "medium", "code": "band_overdue", "message": f"{overdue['label']} band is {overdue['overdue_ratio']:.2f}x past its expected cadence."})

    order = {"high": 0, "medium": 1, "low": 2}
    warnings.sort(key=lambda w: order.get(w["level"], 3))
    return warnings


# ---------------------------------------------------------------------------
# full analysis
# ---------------------------------------------------------------------------

def analyze(rounds: Sequence[Round], settings: AnalysisSettings, toggles: config.RuntimeToggles = None) -> Dict[str, Any]:
    """Produce the complete analysis payload consumed by every dashboard.

    `rounds` must be ordered oldest-first.
    """
    if toggles is None:
        toggles = store.runtime_toggles()
    
    multipliers = _multipliers(rounds)

    signals: Dict[str, Any] = {
        "ascending_ladder": ascending_ladder(multipliers, settings),
        "collapse_ladder": collapse_ladder(multipliers, settings),
        "nested": nested_bands(multipliers, settings),
        "shelf": shelf_signal(multipliers, settings),
        "bait": bait_signal(multipliers, settings),
        "gap_swing": gap_swing(multipliers),
    }
    resistance = resistance_levels(multipliers, settings)
    signals["upper_resistance"] = resistance

    state, scores = classify_state(signals, multipliers, settings)
    streaks = detect_streaks(multipliers, settings.low_band_threshold)
    exhaustion = band_exhaustion(multipliers, settings)
    dist = ling.distribution(multipliers)
    pct = robust_percentiles(multipliers)
    reg = regime(multipliers, settings)
    edge = house_edge(multipliers, settings)

    last = multipliers[-1] if multipliers else 0.0
    trend = signals["gap_swing"]["direction"]
    signals["trend"] = trend

    # Confidence blends sample size, regime clarity and signal agreement.
    agreement = max(scores.values()) - statistics.fmean(sorted(scores.values())[:-1]) if len(scores) > 1 else 0.0
    sample_factor = clamp(len(multipliers) / 150.0)
    confidence = clamp(max(settings.confidence_floor, (agreement * 0.55) + (sample_factor * 0.3) + (float(reg["confidence"]) * 0.15)))

    moonshot_prob = clamp(
        (dist.get("10x", 0.0) * 0.5)
        + (float(exhaustion.get("most_overdue", {}).get("exhaustion", 0.0)) if exhaustion.get("most_overdue") else 0.0) * 0.3
        + (float(signals["ascending_ladder"]["strength"]) * 0.2)
    )
    ignition_prob = clamp(
        (dist.get("5x", 0.0) * 0.45)
        + (float(signals["nested"]["compression"]) * 0.35)
        + (float(resistance["pressure"]) * 0.2)
    )

    # Compute advanced features if available
    advanced_features = {}
    if FEATURES_AVAILABLE and len(multipliers) >= 20:
        try:
            # Pressure analysis
            detector = CeilingDetector(min_touches=3, tolerance=0.05)
            ceilings = detector.detect_resistance_ceilings([{"multiplier": m} for m in multipliers])
            
            if ceilings:
                calculator = PressureCalculator()
                pressure_data = calculator.compute_pressure([{"multiplier": m} for m in multipliers], ceilings)
                metrics = PressureMetrics()
                advanced_features["pressure"] = metrics.format_pressure_gauge(pressure_data)
            
            # Equal baseline analysis
            converter = MultiplierConverter(min_mult=1.0, max_mult=50.0)
            baseline_values = converter.convert_multipliers_to_baseline(multipliers)
            
            computer = TrendlineComputer(window=20)
            trendlines = computer.compute_trendlines(baseline_values)
            momentum_shifts = computer.detect_momentum_shifts(trendlines["momentum"])
            
            advanced_features["baseline"] = {
                "values": baseline_values[-20:],  # Last 20 values
                "trendlines": {
                    "short": trendlines["short_trend"][-20:],
                    "long": trendlines["long_trend"][-20:],
                    "momentum": trendlines["momentum"][-20:]
                },
                "shifts": momentum_shifts[-5:]  # Last 5 shifts
            }
            
            # Moonshot analysis
            linguistics = MoonshotLinguistics()
            moonshot_linguistics = linguistics.compute_all_linguistics(
                [{"multiplier": m, "band": ling.band_label(m)} for m in multipliers],
                advanced_features.get("pressure", {}),
                ceilings,
                include_eta=toggles.moonshot_eta if toggles else True
            )
            
            # Extract ETA data for scanner
            eta_data = moonshot_linguistics.get("eta_predictions")
            
            scanner = MoonshotScanner(lookback=100)
            moonshot_result = scanner.scan_moonshot_conditions(
                [{"multiplier": m, "band": ling.band_label(m)} for m in multipliers],
                moonshot_linguistics,
                eta_data
            )
            advanced_features["moonshot"] = moonshot_result
            
            # Exhaustion calculations (if enabled)
            if toggles and toggles.exhaustion_calculator:
                from features.moonshot_scanner.exhaustion import ExhaustionCalculator
                exhaustion_calc = ExhaustionCalculator()
                
                # Generate pressure history for exhaustion
                pressure_history = []
                for i in range(20, len(multipliers)):
                    window = [{"multiplier": m} for m in multipliers[i-20:i]]
                    pressure_result = calculator.compute_pressure(window, ceilings)
                    pressure_history.append(pressure_result.get("pressure_percent", 0))
                
                combined_exhaustion = exhaustion_calc.compute_combined_exhaustion(
                    [{"multiplier": m} for m in multipliers],
                    pressure_history,
                    ceilings
                )
                advanced_features["exhaustion"] = combined_exhaustion
            
            # Sweet spot and chase readiness (if enabled)
            if toggles and (toggles.sweet_spot_signal or toggles.chase_readiness):
                if toggles.sweet_spot_signal:
                    sweet_spot = {}
                    sweet_spot["score"] = linguistics.compute_sweet_spot_score(
                        [{"multiplier": m} for m in multipliers],
                        moonshot_linguistics
                    )
                    sweet_spot["release_conditions"] = linguistics.compute_release_conditions(
                        [{"multiplier": m} for m in multipliers],
                        moonshot_linguistics
                    )
                    advanced_features["sweet_spot"] = sweet_spot
                
                if toggles.chase_readiness:
                    chase_readiness = linguistics.compute_chase_readiness(
                        [{"multiplier": m} for m in multipliers],
                        moonshot_linguistics
                    )
                    advanced_features["chase_readiness"] = chase_readiness
            
            # Enhanced band analysis
            ladder_detector = LadderDetector(min_length=3)
            ladder_results = ladder_detector.analyze_all_bands([{"multiplier": m} for m in multipliers])
            advanced_features["bands"] = ladder_results
            
            relativity = BandRelativity()
            band_relativity = relativity.compute_band_relativity([{"multiplier": m, "band": ling.band_label(m)} for m in multipliers])
            advanced_features["band_relativity"] = band_relativity
            
        except Exception as e:
            # Log error but don't break analysis
            advanced_features["error"] = str(e)

    # Check for alerts if available
    alerts = []
    if ALERTS_AVAILABLE and advanced_features:
        try:
            source = dict(rounds[-1]) if rounds else {}
            alerts = alert_manager.check_alerts(advanced_features, source=source.get("source", "unknown"))
        except Exception as e:
            logger.error(f"Alert checking failed: {e}")

    return {
        "source": rounds[-1].get("source") if rounds else None,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "state": state,
        "state_scores": scores,
        "state_meta": ling.STATE_META.get(state, ling.STATE_META["Normal"]),
        "narrative": ling.sentence(state, multipliers[-12:]),
        "shape": ling.shape_of(multipliers[-12:]),
        "prediction_confidence": {
            "confidence": confidence,
            "moonshot_probability": moonshot_prob,
            "ignition_probability": ignition_prob,
        },
        "signals": signals,
        "streaks": streaks,
        "distribution": dist,
        "band_histogram": ling.band_histogram(multipliers),
        "percentiles": pct,
        "band_exhaustion": exhaustion,
        "resistance_pressure": {
            "pressure": resistance["pressure"],
            "nearest": resistance["nearest"],
            "recently_cleared": resistance["recently_cleared"],
        },
        "regime": reg,
        "house_edge": edge,
        "dna_report": dna_report(multipliers, settings),
        "session": session_summary(rounds, settings.session_gap_seconds),
        "latest": {
            "multiplier": round(last, 2),
            "band": ling.band_label(last) if multipliers else "—",
            "points": ling.to_points(last) if multipliers else 0.0,
            "energy": ling.energy_of(last) if multipliers else "—",
            "timestamp": rounds[-1].get("timestamp") if rounds else None,
        },
        "warnings": build_warnings(state, signals, streaks, exhaustion, settings),
        "config": settings.as_dict(),
        "advanced_features": advanced_features,
        "alerts": alerts,
    }


# ---------------------------------------------------------------------------
# market view (candles + points)
# ---------------------------------------------------------------------------

def build_candles(rounds: Sequence[Round], rounds_per_candle: int = 5) -> List[Dict[str, Any]]:
    """Aggregate rounds into OHLC candles in Momento point space."""
    if not rounds:
        return []

    size = max(1, int(rounds_per_candle))
    candles: List[Dict[str, Any]] = []

    for start in range(0, len(rounds), size):
        chunk = list(rounds[start : start + size])
        if not chunk:
            continue
        points = [ling.to_points(float(r["multiplier"])) for r in chunk]
        multipliers = [float(r["multiplier"]) for r in chunk]
        candles.append(
            {
                "time": chunk[0].get("timestamp"),
                "open": round(points[0], 2),
                "high": round(max(points), 2),
                "low": round(min(points), 2),
                "close": round(points[-1], 2),
                "volume": len(chunk),
                "peak_multiplier": round(max(multipliers), 2),
                "mean_multiplier": _safe_mean(multipliers),
                "first_round_id": chunk[0].get("id"),
                "last_round_id": chunk[-1].get("id"),
            }
        )
    return candles


def build_points_series(rounds: Sequence[Round]) -> List[Dict[str, Any]]:
    """Point-mapped series with a rolling floor/ceiling envelope."""
    series: List[Dict[str, Any]] = []
    window: List[float] = []

    for entry in rounds:
        multiplier = float(entry["multiplier"])
        points = ling.to_points(multiplier)
        window.append(points)
        if len(window) > 20:
            window.pop(0)
        series.append(
            {
                "id": entry.get("id"),
                "time": entry.get("timestamp"),
                "multiplier": round(multiplier, 2),
                "points": round(points, 2),
                "band": ling.band_for(multiplier)["key"],
                "band_label": ling.band_label(multiplier),
                "color": ling.band_for(multiplier)["color"],
                "floor": round(min(window), 2),
                "ceiling": round(max(window), 2),
                "mean": round(statistics.fmean(window), 2),
            }
        )
    return series


def session_phases(rounds: Sequence[Round], settings: AnalysisSettings) -> List[Dict[str, Any]]:
    """Label each round with its live state — drives the ladder/phase charts."""
    multipliers = _multipliers(rounds)
    out: List[Dict[str, Any]] = []

    for index, entry in enumerate(rounds):
        window = multipliers[max(0, index - 39) : index + 1]
        if len(window) < 4:
            state = "Normal"
            asc: Dict[str, Any] = {"strength": 0.0}
            col: Dict[str, Any] = {"strength": 0.0}
        else:
            asc = ascending_ladder(window, settings)
            col = collapse_ladder(window, settings)
            signals = {
                "ascending_ladder": asc,
                "collapse_ladder": col,
                "shelf": shelf_signal(window, settings),
                "bait": bait_signal(window, settings),
                "nested": nested_bands(window, settings),
            }
            state, _ = classify_state(signals, window, settings)

        multiplier = float(entry["multiplier"])
        out.append(
            {
                "id": entry.get("id"),
                "time": entry.get("timestamp"),
                "multiplier": round(multiplier, 2),
                "points": round(ling.to_points(multiplier), 2),
                "phase": state,
                "phase_color": ling.STATE_META.get(state, ling.STATE_META["Normal"])["color"],
                "ascending_strength": round(float(asc.get("strength", 0.0)), 3),
                "collapse_strength": round(float(col.get("strength", 0.0)), 3),
            }
        )
    return out


def mega_moonshot_scores(rounds: Sequence[Round], settings: AnalysisSettings) -> List[Dict[str, Any]]:
    """Score fixed look-back ranges for mega-moonshot readiness."""
    multipliers = _multipliers(rounds)
    out: List[Dict[str, Any]] = []

    for window_size in (25, 50, 100, 200):
        window = multipliers[-window_size:]
        if len(window) < 10:
            continue
        exhaustion = band_exhaustion(window, settings)
        overdue = exhaustion.get("most_overdue") or {}
        asc = ascending_ladder(window, settings)
        nested = nested_bands(window, settings)
        dist = ling.distribution(window)

        score = clamp(
            (float(overdue.get("exhaustion", 0.0)) * 0.4)
            + (float(asc.get("strength", 0.0)) * 0.25)
            + (float(nested.get("compression", 0.0)) * 0.2)
            + (dist.get("20x", 0.0) * 0.15)
        )
        out.append(
            {
                "range": window_size,
                "rounds": len(window),
                "score": score,
                "grade": "A" if score > 0.7 else ("B" if score > 0.5 else ("C" if score > 0.3 else "D")),
                "peak": round(max(window), 2),
                "overdue_band": overdue.get("label"),
                "overdue_ratio": overdue.get("overdue_ratio", 0.0),
                "compression": nested.get("compression", 0.0),
            }
        )
    return out


def moonshot_eta(rounds: Sequence[Round], settings: AnalysisSettings) -> List[Dict[str, Any]]:
    """Expected rounds-until-hit for each high band, plus a wall-clock ETA."""
    multipliers = _multipliers(rounds)
    if len(multipliers) < 20:
        return []

    summary = session_summary(rounds, settings.session_gap_seconds)
    seconds_per_round = float(summary.get("avg_round_secs") or 0.0)
    exhaustion = band_exhaustion(multipliers, settings)

    out: List[Dict[str, Any]] = []
    for band in exhaustion["bands"]:
        if band["threshold"] < 5 or not band["expected_gap"]:
            continue
        remaining = max(0.0, float(band["expected_gap"]) - float(band["rounds_since"]))
        eta_seconds = round(remaining * seconds_per_round, 1) if seconds_per_round else None
        out.append(
            {
                "label": band["label"],
                "threshold": band["threshold"],
                "expected_gap": band["expected_gap"],
                "rounds_since": band["rounds_since"],
                "rounds_remaining": round(remaining, 1),
                "eta_seconds": eta_seconds,
                "overdue": band["overdue_ratio"] > 1.0,
                "overdue_ratio": band["overdue_ratio"],
                "ripeness": clamp(float(band["overdue_ratio"]) / 1.8),
                "status": band["status"],
            }
        )
    return out
