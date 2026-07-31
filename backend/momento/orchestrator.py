"""Decision orchestrator.

Sits between the analysis engines and the operator. It never places anything —
it produces an execution plan: how patient to be, how fast to move, how much
risk is acceptable and which mistakes to actively prevent.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence

from . import analysis, db, linguistics as ling
from .config import AnalysisSettings

MODULES: Dict[str, Dict[str, Any]] = {
    "conservative": {
        "label": "Conservative",
        "description": "Waits for confluence. Small size, early exits, hard stops.",
        "min_confidence": 0.62,
        "size_multiplier": 0.6,
        "target_multiplier": 1.6,
        "max_consecutive_losses": 2,
        "patience_bias": 1.35,
    },
    "default": {
        "label": "Balanced",
        "description": "Balanced patience and aggression. The house default.",
        "min_confidence": 0.48,
        "size_multiplier": 1.0,
        "target_multiplier": 2.1,
        "max_consecutive_losses": 3,
        "patience_bias": 1.0,
    },
    "aggressive": {
        "label": "Aggressive",
        "description": "Acts on early signals, holds for higher bands, wider stops.",
        "min_confidence": 0.36,
        "size_multiplier": 1.5,
        "target_multiplier": 3.4,
        "max_consecutive_losses": 5,
        "patience_bias": 0.7,
    },
}

DEFAULT_SETTINGS: Dict[str, Any] = {
    "module": "default",
    "bankroll": 1000.0,
    "base_position_size": 10.0,
    "max_risk_per_round": 0.02,
    "daily_loss_limit": 0.15,
    "position_sizing_method": "confidence_scaled",
    "min_confidence_threshold": 0.45,
    "execution_delay_ms": 400,
}


def settings() -> Dict[str, Any]:
    stored = db.get_setting("orchestrator") or {}
    merged = dict(DEFAULT_SETTINGS)
    merged.update({k: v for k, v in stored.items() if k in DEFAULT_SETTINGS and v is not None})
    if merged["module"] not in MODULES:
        merged["module"] = "default"
    return merged


def update_settings(values: Dict[str, Any]) -> Dict[str, Any]:
    current = settings()
    for key, value in values.items():
        if key not in DEFAULT_SETTINGS or value is None:
            continue
        if key == "module":
            if str(value) in MODULES:
                current[key] = str(value)
        elif key == "position_sizing_method":
            if str(value) in ("fixed", "confidence_scaled", "kelly"):
                current[key] = str(value)
        else:
            try:
                current[key] = float(value)
            except (TypeError, ValueError):
                continue
    db.set_setting("orchestrator", current)
    return current


# ---------------------------------------------------------------------------
# engines
# ---------------------------------------------------------------------------

def patience_engine(payload: Dict[str, Any], module: Dict[str, Any]) -> Dict[str, Any]:
    """How long should the operator wait before acting?"""
    state = payload.get("state", "Normal")
    confidence = float(payload.get("prediction_confidence", {}).get("confidence", 0.0))
    streaks = payload.get("streaks", {})
    exhaustion = payload.get("band_exhaustion", {}).get("most_overdue") or {}

    wait_states = {"Collapse": 5, "Bait": 4, "Exhaustion": 3, "Shelf": 2, "Normal": 1, "Ignition": 0, "Moonshot": 0}
    base_wait = wait_states.get(state, 1)
    bias = float(module["patience_bias"])

    wait_rounds = int(round(base_wait * bias))
    if confidence >= module["min_confidence"] and state in ("Ignition", "Moonshot"):
        wait_rounds = 0
    if int(streaks.get("current_low_streak", 0)) >= 6:
        wait_rounds = max(0, wait_rounds - 1)
    if float(exhaustion.get("overdue_ratio", 0) or 0) > 1.5:
        wait_rounds = max(0, wait_rounds - 1)

    return {
        "wait_rounds": wait_rounds,
        "verdict": "act_now" if wait_rounds == 0 else ("prepare" if wait_rounds <= 2 else "stand_down"),
        "reason": (
            f"{state} with {confidence:.0%} confidence — "
            + ("conditions align, act on the next round." if wait_rounds == 0 else f"wait {wait_rounds} more round(s) for confirmation.")
        ),
        "patience_bias": bias,
    }


def speed_engine(payload: Dict[str, Any], module: Dict[str, Any], settings_map: Dict[str, Any]) -> Dict[str, Any]:
    """How fast must the exit be once in?"""
    session = payload.get("session", {})
    avg_round = float(session.get("avg_round_secs") or 0.0)
    volatility = float(payload.get("regime", {}).get("volatility") or 0.0)

    if volatility > 1.2:
        tempo = "fast"
        window_pct = 0.35
    elif volatility > 0.8:
        tempo = "medium"
        window_pct = 0.55
    else:
        tempo = "measured"
        window_pct = 0.75

    return {
        "tempo": tempo,
        "avg_round_secs": avg_round,
        "exit_window_secs": round(avg_round * window_pct, 2) if avg_round else None,
        "execution_delay_ms": float(settings_map["execution_delay_ms"]),
        "reason": f"Volatility {volatility:.2f} implies a {tempo} exit tempo.",
    }


def risk_engine(payload: Dict[str, Any], module: Dict[str, Any], settings_map: Dict[str, Any], performance: Dict[str, Any]) -> Dict[str, Any]:
    """Position sizing and hard risk limits."""
    bankroll = float(settings_map["bankroll"])
    base_size = float(settings_map["base_position_size"])
    confidence = float(payload.get("prediction_confidence", {}).get("confidence", 0.0))
    method = str(settings_map["position_sizing_method"])

    max_risk = bankroll * float(settings_map["max_risk_per_round"])
    daily_limit = bankroll * float(settings_map["daily_loss_limit"])

    if method == "fixed":
        size = base_size
    elif method == "kelly":
        # Fractional Kelly against the forecast range's implied odds.
        forecast_payload = payload.get("forecast") or {}
        target = float(forecast_payload.get("range_hi") or module["target_multiplier"])
        odds = max(0.05, target - 1.0)
        edge = (confidence * odds) - (1.0 - confidence)
        kelly = max(0.0, edge / odds) if odds > 0 else 0.0
        size = bankroll * min(0.05, kelly * 0.25)
    else:
        size = base_size * (0.5 + confidence) * float(module["size_multiplier"])

    size = round(max(0.0, min(size, max_risk)), 2)
    consecutive_losses = int(performance.get("consecutive_losses", 0))
    daily_pnl = float(performance.get("daily_pnl", 0.0))

    blocks: List[str] = []
    if consecutive_losses >= int(module["max_consecutive_losses"]):
        blocks.append(f"{consecutive_losses} consecutive losses hit the module limit.")
    if daily_pnl <= -daily_limit:
        blocks.append("Daily loss limit reached.")
    if confidence < float(settings_map["min_confidence_threshold"]):
        blocks.append(f"Confidence {confidence:.0%} is below the {float(settings_map['min_confidence_threshold']):.0%} threshold.")

    if consecutive_losses >= int(module["max_consecutive_losses"]) or daily_pnl <= -daily_limit:
        level = "critical"
    elif consecutive_losses >= max(1, int(module["max_consecutive_losses"]) - 1) or confidence < 0.35:
        level = "elevated"
    else:
        level = "normal"

    return {
        "position_size": 0.0 if blocks else size,
        "suggested_size": size,
        "max_risk_per_round": round(max_risk, 2),
        "daily_loss_limit": round(daily_limit, 2),
        "sizing_method": method,
        "risk_level": level,
        "blocked": bool(blocks),
        "blocks": blocks,
        "bankroll": bankroll,
    }


def mistake_prevention(payload: Dict[str, Any], performance: Dict[str, Any]) -> List[Dict[str, Any]]:
    """The guardrails that stop the classic operator errors."""
    out: List[Dict[str, Any]] = []
    state = payload.get("state", "Normal")
    streaks = payload.get("streaks", {})
    consecutive = int(performance.get("consecutive_losses", 0))

    if state == "Bait":
        out.append({"code": "chasing_bait", "severity": "high", "message": "Do not chase this spike — the surrounding window is weak."})
    if state == "Collapse":
        out.append({"code": "catching_knife", "severity": "high", "message": "Collapse in progress. Wait for a floor to form before entering."})
    if consecutive >= 2:
        out.append({"code": "tilt_risk", "severity": "high" if consecutive >= 3 else "medium", "message": f"{consecutive} losses in a row — step down size, do not martingale."})
    if int(streaks.get("current_high_streak", 0)) >= 3:
        out.append({"code": "overconfidence", "severity": "medium", "message": "Win streak running. Bank profit rather than raising size."})
    if state == "Exhaustion":
        out.append({"code": "late_entry", "severity": "medium", "message": "The move already happened. Entering now is a late entry."})
    if float(payload.get("prediction_confidence", {}).get("confidence", 0.0)) < 0.3:
        out.append({"code": "low_information", "severity": "low", "message": "Low-confidence read — treat any entry as a probe."})

    return out


def instruction(payload: Dict[str, Any], module: Dict[str, Any], patience: Dict[str, Any], risk: Dict[str, Any], speed: Dict[str, Any]) -> Dict[str, Any]:
    """The single, plain-language instruction shown at the top of the console."""
    forecast_payload = payload.get("forecast") or {}
    state = payload.get("state", "Normal")
    confidence = float(payload.get("prediction_confidence", {}).get("confidence", 0.0))
    target = float(forecast_payload.get("range_hi") or module["target_multiplier"])
    conservative_target = round(max(1.15, min(target, float(module["target_multiplier"]))), 2)

    if risk["blocked"]:
        action = "STAND_DOWN"
        headline = "Stand down"
        detail = risk["blocks"][0]
    elif patience["verdict"] == "act_now":
        action = "ENTER"
        headline = f"Enter next round, exit at {conservative_target:.2f}x"
        detail = f"{state} with {confidence:.0%} confidence. {speed['reason']}"
    elif patience["verdict"] == "prepare":
        action = "PREPARE"
        headline = f"Prepare — {patience['wait_rounds']} round(s) out"
        detail = patience["reason"]
    else:
        action = "WAIT"
        headline = "Wait for structure"
        detail = patience["reason"]

    return {
        "action": action,
        "headline": headline,
        "detail": detail,
        "target_multiplier": conservative_target,
        "stop_multiplier": round(max(1.01, conservative_target * 0.55), 2),
        "position_size": risk["position_size"],
        "confidence": confidence,
        "confidence_label": "HIGH" if confidence >= 0.66 else ("MEDIUM" if confidence >= 0.38 else "LOW"),
    }


def plan(payload: Dict[str, Any], performance: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Build the full execution plan for the current market snapshot."""
    settings_map = settings()
    module = MODULES[settings_map["module"]]
    perf = performance or {"consecutive_losses": 0, "daily_pnl": 0.0, "win_rate": 0.0, "total_trades": 0}

    patience = patience_engine(payload, module)
    speed = speed_engine(payload, module, settings_map)
    risk = risk_engine(payload, module, settings_map, perf)
    mistakes = mistake_prevention(payload, perf)
    directive = instruction(payload, module, patience, risk, speed)

    return {
        "module": {"id": settings_map["module"], **module},
        "modules_available": [{"id": key, **value} for key, value in MODULES.items()],
        "settings": settings_map,
        "instruction": directive,
        "patience": patience,
        "speed": speed,
        "risk": risk,
        "mistake_prevention": mistakes,
        "state": payload.get("state"),
        "narrative": payload.get("narrative"),
        "generated_at": db.utc_now(),
    }
