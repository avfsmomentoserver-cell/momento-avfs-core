"""MomentoLinguistics — the semantic layer.

Turns raw multipliers into a shared vocabulary (bands, energy, shapes, states)
so every engine can talk about market behaviour instead of numbers.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence

# Layer 1 — band vocabulary. Ordered, lower bound inclusive.
BANDS: List[Dict[str, Any]] = [
    {"key": "dust", "label": "Dust", "lo": 1.0, "hi": 1.2, "color": "#7f1d2b"},
    {"key": "floor", "label": "Floor", "lo": 1.2, "hi": 1.5, "color": "#a3324a"},
    {"key": "low", "label": "Low", "lo": 1.5, "hi": 2.0, "color": "#c2563f"},
    {"key": "base", "label": "Base", "lo": 2.0, "hi": 3.0, "color": "#c98a24"},
    {"key": "mid", "label": "Mid", "lo": 3.0, "hi": 5.0, "color": "#a9b62b"},
    {"key": "high", "label": "High", "lo": 5.0, "hi": 10.0, "color": "#3ddc84"},
    {"key": "ignition", "label": "Ignition", "lo": 10.0, "hi": 20.0, "color": "#2ee6c0"},
    {"key": "moonshot", "label": "Moonshot", "lo": 20.0, "hi": 50.0, "color": "#38bdf8"},
    {"key": "mega", "label": "Mega", "lo": 50.0, "hi": 100.0, "color": "#818cf8"},
    {"key": "cosmic", "label": "Cosmic", "lo": 100.0, "hi": float("inf"), "color": "#f472b6"},
]

BAND_KEYS: List[str] = [b["key"] for b in BANDS]

# Layer 6 — market states used across every dashboard and the forecast engine.
STATES: List[str] = [
    "Normal",
    "Collapse",
    "Ignition",
    "Moonshot",
    "Exhaustion",
    "Shelf",
    "Bait",
]

STATE_META: Dict[str, Dict[str, str]] = {
    "Normal": {"tone": "neutral", "color": "#8b95b7", "meaning": "Balanced distribution, no dominant pressure"},
    "Collapse": {"tone": "bear", "color": "#ef4444", "meaning": "Descending ceilings, energy draining out of the curve"},
    "Ignition": {"tone": "bull", "color": "#2ee6c0", "meaning": "Compression released, upside energy building"},
    "Moonshot": {"tone": "bull", "color": "#38bdf8", "meaning": "High band cleared, extended run in progress"},
    "Exhaustion": {"tone": "bear", "color": "#f59e0b", "meaning": "Upside spent, mean reversion likely"},
    "Shelf": {"tone": "neutral", "color": "#a3a3a3", "meaning": "Flat variance shelf, market coiling"},
    "Bait": {"tone": "warn", "color": "#fb923c", "meaning": "Single spike inside weakness — false invitation"},
}

# Distribution buckets exposed to the UI (survival thresholds).
DISTRIBUTION_THRESHOLDS: List[float] = [1.0, 2.0, 3.0, 5.0, 10.0, 20.0, 50.0, 100.0]


@dataclass
class Token:
    """A single round expressed in the Momento language."""

    multiplier: float
    band: str
    band_label: str
    points: float
    energy: str
    color: str

    def as_dict(self) -> Dict[str, Any]:
        return {
            "multiplier": self.multiplier,
            "band": self.band,
            "band_label": self.band_label,
            "points": self.points,
            "energy": self.energy,
            "color": self.color,
        }


def band_for(multiplier: float) -> Dict[str, Any]:
    """Layer 1 — classify a multiplier into its band descriptor."""
    value = max(1.0, float(multiplier))
    for band in BANDS:
        if band["lo"] <= value < band["hi"]:
            return band
    return BANDS[-1]


def band_label(multiplier: float) -> str:
    return band_for(multiplier)["label"]


def to_points(multiplier: float) -> float:
    """Momento scaler — log-compress a multiplier into a linear point space.

    100 points == 1.00x, every doubling adds ~30 points. This keeps a 1.02x
    and a 250x on the same visual axis without destroying resolution.
    """
    value = max(1.0, float(multiplier))
    return round(100.0 + (math.log2(value) * 30.0), 3)


def from_points(points: float) -> float:
    return round(2 ** ((float(points) - 100.0) / 30.0), 4)


def energy_of(multiplier: float) -> str:
    """Layer 3 — energy release descriptor."""
    value = float(multiplier)
    if value < 1.3:
        return "snuffed"
    if value < 2.0:
        return "damp"
    if value < 3.0:
        return "steady"
    if value < 6.0:
        return "charged"
    if value < 15.0:
        return "surging"
    if value < 50.0:
        return "explosive"
    return "runaway"


def tokenize(multiplier: float) -> Token:
    band = band_for(multiplier)
    return Token(
        multiplier=round(float(multiplier), 2),
        band=band["key"],
        band_label=band["label"],
        points=to_points(multiplier),
        energy=energy_of(multiplier),
        color=band["color"],
    )


def color_for(multiplier: float) -> str:
    """Legacy round `color` field used by the collectors."""
    value = float(multiplier)
    if value < 2.0:
        return "blue"
    if value < 10.0:
        return "purple"
    return "pink"


def shape_of(window: Sequence[float]) -> str:
    """Layer 4 — topology of the recent window."""
    if len(window) < 3:
        return "seed"
    points = [to_points(m) for m in window]
    first_half = points[: len(points) // 2]
    second_half = points[len(points) // 2 :]
    delta = (sum(second_half) / len(second_half)) - (sum(first_half) / len(first_half))
    spread = max(points) - min(points)

    if spread < 12:
        return "shelf"
    if delta > 10:
        return "ramp"
    if delta < -10:
        return "slide"
    peak_index = points.index(max(points))
    if peak_index in (0, len(points) - 1):
        return "edge-spike"
    return "arch"


def sentence(state: str, window: Sequence[float]) -> str:
    """Layer 8 — compose a plain-language reading of the current market."""
    if not window:
        return "No rounds available yet — awaiting ingest."
    token = tokenize(window[-1])
    shape = shape_of(window)
    meta = STATE_META.get(state, STATE_META["Normal"])
    return (
        f"{state}: {meta['meaning'].lower()}. "
        f"Last round settled {token.multiplier:.2f}x in the {token.band_label} band "
        f"with {token.energy} energy, forming a {shape} across the last {len(window)} rounds."
    )


def distribution(multipliers: Sequence[float]) -> Dict[str, float]:
    """Survival distribution: share of rounds that reached each threshold."""
    total = len(multipliers)
    if total == 0:
        return {f"{int(t)}x": 0.0 for t in DISTRIBUTION_THRESHOLDS}
    out: Dict[str, float] = {}
    for threshold in DISTRIBUTION_THRESHOLDS:
        hits = sum(1 for m in multipliers if float(m) >= threshold)
        out[f"{int(threshold)}x"] = round(hits / total, 4)
    return out


def band_histogram(multipliers: Sequence[float]) -> List[Dict[str, Any]]:
    """Per-band counts used by the distribution and DNA panels."""
    total = max(1, len(multipliers))
    buckets = {band["key"]: 0 for band in BANDS}
    for value in multipliers:
        buckets[band_for(value)["key"]] += 1
    return [
        {
            "band": band["key"],
            "label": band["label"],
            "color": band["color"],
            "lo": band["lo"],
            "hi": None if band["hi"] == float("inf") else band["hi"],
            "count": buckets[band["key"]],
            "share": round(buckets[band["key"]] / total, 4),
        }
        for band in BANDS
    ]


def reverse_layers(multiplier: float) -> Dict[str, Any]:
    """Explain a multiplier through every linguistic layer (debug/inspect view)."""
    token = tokenize(multiplier)
    return {
        "layer_1_band": {"band": token.band, "label": token.band_label},
        "layer_2_scale": {"points": token.points, "roundtrip": from_points(token.points)},
        "layer_3_energy": {"energy": token.energy},
        "layer_4_shape": {"note": "requires a window — see shape_of()"},
        "layer_5_color": {"color": color_for(multiplier)},
        "layer_6_state": {"note": "state is derived from a window by the analysis engine"},
        "layer_7_pressure": {"note": "pressure is derived from ladders and resistance"},
        "layer_8_sentence": {"note": "composed once state is known"},
    }


def nearest_band_above(multiplier: float) -> Optional[Dict[str, Any]]:
    value = float(multiplier)
    for band in BANDS:
        if band["lo"] > value:
            return band
    return None


# ============================================================================
# LADDER DETECTION SYSTEM
# ============================================================================

@dataclass
class Ladder:
    """A detected ladder pattern (ascending or descending sequence)."""
    ladder_type: str  # "ascend" or "collapse"
    start_index: int
    end_index: int
    length: int
    start_multiplier: float
    end_multiplier: float
    base_multiplier: float
    slope: float  # Rate of change
    strength: str  # "pure" or "weak"


def detect_ladders(
    multipliers: Sequence[float],
    min_length: int = 4,
    base_window: int = 20
) -> List[Ladder]:
    """Detect ladder patterns in a sequence of multipliers.
    
    Args:
        multipliers: Sequence of multiplier values
        min_length: Minimum rounds to qualify as ladder (default: 4)
        base_window: Window size for calculating base multiplier (default: 20)
        
    Returns:
        List of detected Ladder objects
    """
    if len(multipliers) < min_length:
        return []
    
    ladders = []
    multipliers = [float(m) for m in multipliers]
    
    # Calculate rolling base multiplier
    base_multipliers = []
    for i in range(len(multipliers)):
        window_start = max(0, i - base_window + 1)
        window = multipliers[window_start:i + 1]
        base_multipliers.append(sum(window) / len(window) if window else 1.0)
    
    i = 0
    while i < len(multipliers) - min_length + 1:
        base = base_multipliers[i]
        
        # Try to detect ascend ladder
        ascend_length = 0
        for j in range(i, len(multipliers)):
            if multipliers[j] >= base:
                ascend_length += 1
            else:
                break
        
        if ascend_length >= min_length:
            # Calculate slope
            start_mult = multipliers[i]
            end_mult = multipliers[i + ascend_length - 1]
            slope = (end_mult - start_mult) / ascend_length if ascend_length > 0 else 0
            
            # Determine strength (pure = strictly increasing, weak = general trend)
            is_pure = all(multipliers[k] < multipliers[k + 1] for k in range(i, i + ascend_length - 1))
            strength = "pure" if is_pure else "weak"
            
            ladders.append(Ladder(
                ladder_type="ascend",
                start_index=i,
                end_index=i + ascend_length - 1,
                length=ascend_length,
                start_multiplier=start_mult,
                end_multiplier=end_mult,
                base_multiplier=base,
                slope=slope,
                strength=strength
            ))
            i += ascend_length
            continue
        
        # Try to detect collapse ladder
        collapse_length = 0
        for j in range(i, len(multipliers)):
            if multipliers[j] <= base:
                collapse_length += 1
            else:
                break
        
        if collapse_length >= min_length:
            # Calculate slope
            start_mult = multipliers[i]
            end_mult = multipliers[i + collapse_length - 1]
            slope = (end_mult - start_mult) / collapse_length if collapse_length > 0 else 0
            
            # Determine strength (pure = strictly decreasing, weak = general trend)
            is_pure = all(multipliers[k] > multipliers[k + 1] for k in range(i, i + collapse_length - 1))
            strength = "pure" if is_pure else "weak"
            
            ladders.append(Ladder(
                ladder_type="collapse",
                start_index=i,
                end_index=i + collapse_length - 1,
                length=collapse_length,
                start_multiplier=start_mult,
                end_multiplier=end_mult,
                base_multiplier=base,
                slope=slope,
                strength=strength
            ))
            i += collapse_length
            continue
        
        i += 1
    
    return ladders


def calculate_ladder_distances(ladders: List[Ladder]) -> Dict[str, Any]:
    """Calculate distances between same-type ladders.
    
    Args:
        ladders: List of detected ladders
        
    Returns:
        Dictionary with distance statistics
    """
    if not ladders:
        return {
            "ascend_distances": [],
            "collapse_distances": [],
            "avg_ascend_distance": 0,
            "avg_collapse_distance": 0,
            "low_distance_clusters": []
        }
    
    # Separate by type
    ascend_ladders = [l for l in ladders if l.ladder_type == "ascend"]
    collapse_ladders = [l for l in ladders if l.ladder_type == "collapse"]
    
    # Calculate distances
    ascend_distances = []
    for i in range(len(ascend_ladders) - 1):
        distance = ascend_ladders[i + 1].start_index - ascend_ladders[i].end_index
        ascend_distances.append(distance)
    
    collapse_distances = []
    for i in range(len(collapse_ladders) - 1):
        distance = collapse_ladders[i + 1].start_index - collapse_ladders[i].end_index
        collapse_distances.append(distance)
    
    # Identify low-distance clusters (< 15 rounds)
    low_distance_threshold = 15
    low_distance_clusters = []
    
    for i, dist in enumerate(ascend_distances):
        if dist < low_distance_threshold:
            low_distance_clusters.append({
                "type": "ascend",
                "ladder_1_index": ascend_ladders[i].start_index,
                "ladder_2_index": ascend_ladders[i + 1].start_index,
                "distance": dist
            })
    
    for i, dist in enumerate(collapse_distances):
        if dist < low_distance_threshold:
            low_distance_clusters.append({
                "type": "collapse",
                "ladder_1_index": collapse_ladders[i].start_index,
                "ladder_2_index": collapse_ladders[i + 1].start_index,
                "distance": dist
            })
    
    return {
        "ascend_distances": ascend_distances,
        "collapse_distances": collapse_distances,
        "avg_ascend_distance": sum(ascend_distances) / len(ascend_distances) if ascend_distances else 0,
        "avg_collapse_distance": sum(collapse_distances) / len(collapse_distances) if collapse_distances else 0,
        "low_distance_clusters": low_distance_clusters,
        "low_distance_threshold": low_distance_threshold
    }


# ============================================================================
# CEILING DETECTION
# ============================================================================

def detect_resistance_ceilings(
    multipliers: Sequence[float],
    window: int = 50,
    upper_percentile: float = 95,
    lower_percentile: float = 5
) -> Dict[str, Any]:
    """Detect constant upper and lower resistance points.
    
    Args:
        multipliers: Sequence of multiplier values
        window: Rolling window size for percentile calculation
        upper_percentile: Upper ceiling percentile (default: 95)
        lower_percentile: Lower ceiling percentile (default: 5)
        
    Returns:
        Dictionary with ceiling information
    """
    if len(multipliers) < window:
        return {
            "upper_ceiling": None,
            "lower_ceiling": None,
            "ceiling_breach_frequency": 0,
            "ladder_containment_rate": 0
        }
    
    multipliers = [float(m) for m in multipliers]
    
    # Calculate rolling percentiles
    upper_ceilings = []
    lower_ceilings = []
    
    for i in range(window - 1, len(multipliers)):
        window_data = multipliers[i - window + 1:i + 1]
        window_data.sort()
        upper_idx = int(len(window_data) * upper_percentile / 100)
        lower_idx = int(len(window_data) * lower_percentile / 100)
        upper_ceilings.append(window_data[upper_idx])
        lower_ceilings.append(window_data[lower_idx])
    
    # Use most recent values as current ceilings
    upper_ceiling = upper_ceilings[-1] if upper_ceilings else None
    lower_ceiling = lower_ceilings[-1] if lower_ceilings else None
    
    # Calculate breach frequency
    if upper_ceiling is not None:
        upper_breaches = sum(1 for m in multipliers if m > upper_ceiling)
        upper_breach_freq = upper_breaches / len(multipliers)
    else:
        upper_breach_freq = 0
    
    if lower_ceiling is not None:
        lower_breaches = sum(1 for m in multipliers if m < lower_ceiling)
        lower_breach_freq = lower_breaches / len(multipliers)
    else:
        lower_breach_freq = 0
    
    # Calculate ladder containment rate
    ladders = detect_ladders(multipliers)
    contained_ladders = 0
    for ladder in ladders:
        if upper_ceiling and lower_ceiling:
            ladder_max = max(multipliers[ladder.start_index:ladder.end_index + 1])
            ladder_min = min(multipliers[ladder.start_index:ladder.end_index + 1])
            if ladder_min >= lower_ceiling and ladder_max <= upper_ceiling:
                contained_ladders += 1
    
    containment_rate = contained_ladders / len(ladders) if ladders else 0
    
    return {
        "upper_ceiling": upper_ceiling,
        "lower_ceiling": lower_ceiling,
        "upper_breach_frequency": upper_breach_freq,
        "lower_breach_frequency": lower_breach_freq,
        "ladder_containment_rate": containment_rate,
        "window": window,
        "upper_percentile": upper_percentile,
        "lower_percentile": lower_percentile
    }


# ============================================================================
# COMPRESSION ENERGY
# ============================================================================

def multiplier_to_forex_points(multiplier: float) -> float:
    """Convert multiplier to forex points using log2 scaling.
    
    Args:
        multiplier: Multiplier value
        
    Returns:
        Forex points value
    """
    return math.log2(max(1.0, float(multiplier))) * 1000


def forex_points_to_multiplier(points: float) -> float:
    """Convert forex points back to multiplier.
    
    Args:
        points: Forex points value
        
    Returns:
        Multiplier value
    """
    return 2 ** (points / 1000)


def calculate_compression_energy(
    multipliers: Sequence[float],
    ceiling_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Calculate compression energy under resistance ceiling.
    
    Args:
        multipliers: Sequence of multiplier values
        ceiling_info: Ceiling detection results from detect_resistance_ceilings()
        
    Returns:
        Dictionary with compression energy metrics
    """
    if not multipliers or ceiling_info.get("upper_ceiling") is None:
        return {
            "compression_energy": 0,
            "gap_values": [],
            "avg_gap": 0,
            "max_gap": 0,
            "release_pressure_threshold": 0
        }
    
    multipliers = [float(m) for m in multipliers]
    upper_ceiling = ceiling_info["upper_ceiling"]
    
    # Calculate gap values (distance to ceiling)
    gap_values = []
    for m in multipliers:
        if m < upper_ceiling:
            gap = upper_ceiling - m
            gap_values.append(gap)
    
    if not gap_values:
        return {
            "compression_energy": 0,
            "gap_values": [],
            "avg_gap": 0,
            "max_gap": 0,
            "release_pressure_threshold": 0
        }
    
    # Convert gaps to forex points for energy calculation
    gap_forex_points = [multiplier_to_forex_points(g) for g in gap_values]
    
    # Compression energy = sum of gap values in forex points
    compression_energy = sum(gap_forex_points)
    
    # Release pressure threshold = when gap is very small (< 5% of ceiling)
    release_threshold = upper_ceiling * 0.05
    
    return {
        "compression_energy": compression_energy,
        "gap_values": gap_values,
        "gap_forex_points": gap_forex_points,
        "avg_gap": sum(gap_values) / len(gap_values),
        "max_gap": max(gap_values),
        "min_gap": min(gap_values),
        "release_pressure_threshold": release_threshold,
        "current_gap": gap_values[-1] if gap_values else 0,
        "near_release": gap_values[-1] < release_threshold if gap_values else False
    }


# ============================================================================
# LADDER DISTRIBUTION & PRESSURE
# ============================================================================

def calculate_ladder_distribution(ladders: List[Ladder]) -> Dict[str, Any]:
    """Calculate ladder distribution metrics.
    
    Args:
        ladders: List of detected ladders
        
    Returns:
        Dictionary with distribution statistics
    """
    if not ladders:
        return {
            "total_ladders": 0,
            "ascend_count": 0,
            "collapse_count": 0,
            "length_distribution": {},
            "frequency_by_type": {},
            "avg_length": 0
        }
    
    ascend_ladders = [l for l in ladders if l.ladder_type == "ascend"]
    collapse_ladders = [l for l in ladders if l.ladder_type == "collapse"]
    
    # Length distribution
    lengths = [l.length for l in ladders]
    length_distribution = {
        "min": min(lengths),
        "max": max(lengths),
        "avg": sum(lengths) / len(lengths),
        "median": sorted(lengths)[len(lengths) // 2]
    }
    
    # Frequency by type
    frequency_by_type = {
        "ascend": len(ascend_ladders),
        "collapse": len(collapse_ladders)
    }
    
    return {
        "total_ladders": len(ladders),
        "ascend_count": len(ascend_ladders),
        "collapse_count": len(collapse_ladders),
        "length_distribution": length_distribution,
        "frequency_by_type": frequency_by_type,
        "avg_length": sum(lengths) / len(lengths)
    }


def calculate_ladder_pressure(
    ladders: List[Ladder],
    distance_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Calculate pressure formed by continuous low-distance same-type ladders.
    
    Args:
        ladders: List of detected ladders
        distance_info: Distance information from calculate_ladder_distances()
        
    Returns:
        Dictionary with pressure metrics
    """
    if not ladders:
        return {
            "pressure_score": 0,
            "continuous_clusters": 0,
            "pressure_accumulation": 0,
            "release_prediction": "none"
        }
    
    low_distance_clusters = distance_info.get("low_distance_clusters", [])
    
    # Calculate pressure based on cluster count and ladder lengths
    pressure_accumulation = 0
    for cluster in low_distance_clusters:
        # Find the ladders in this cluster
        cluster_ladders = [l for l in ladders if l.start_index == cluster["ladder_1_index"] or l.start_index == cluster["ladder_2_index"]]
        if cluster_ladders:
            # Add ladder lengths to pressure
            pressure_accumulation += sum(l.length for l in cluster_ladders)
    
    # Normalize pressure score (0-1)
    max_possible_pressure = len(ladders) * 20  # Assume max 20 rounds per ladder
    pressure_score = min(1.0, pressure_accumulation / max_possible_pressure if max_possible_pressure > 0 else 0)
    
    # Release prediction
    if pressure_score > 0.7:
        release_prediction = "imminent"
    elif pressure_score > 0.4:
        release_prediction = "likely"
    elif pressure_score > 0.2:
        release_prediction = "possible"
    else:
        release_prediction = "none"
    
    return {
        "pressure_score": pressure_score,
        "continuous_clusters": len(low_distance_clusters),
        "pressure_accumulation": pressure_accumulation,
        "release_prediction": release_prediction,
        "cluster_details": low_distance_clusters
    }
