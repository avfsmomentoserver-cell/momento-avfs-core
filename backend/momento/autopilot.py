"""Autopilot engine.

Turns the orchestrator's execution plan into recorded decisions, then scores
those decisions against the round that actually landed. It is a paper-trading
decision recorder: it measures whether the platform's reasoning would have
worked, and every number on the Autopilot dashboard comes from these rows.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from . import db, orchestrator, store

logger = logging.getLogger("momento.autopilot")

DEFAULT_CONFIG: Dict[str, Any] = {
    "enabled": False,
    "source": "aviator",
    "max_risk_per_round": 0.02,
    "daily_loss_limit": 0.15,
    "max_consecutive_losses": 3,
    "enable_ceiling_analyzer": True,
    "enable_gap_swing_analyzer": True,
    "enable_linguistic_analysis": True,
    "min_confidence_threshold": 0.45,
    "execution_delay_ms": 400,
    "base_position_size": 10.0,
    "position_sizing_method": "confidence_scaled",
    "ceiling_analyzer_weight": 0.35,
    "gap_swing_analyzer_weight": 0.3,
    "linguistic_analysis_weight": 0.35,
}


def config() -> Dict[str, Any]:
    stored = db.get_setting("autopilot") or {}
    merged = dict(DEFAULT_CONFIG)
    for key, value in stored.items():
        if key in merged and value is not None:
            merged[key] = value
    return merged


def update_config(values: Dict[str, Any]) -> Dict[str, Any]:
    current = config()
    for key, value in values.items():
        if key not in DEFAULT_CONFIG or value is None:
            continue
        default = DEFAULT_CONFIG[key]
        if isinstance(default, bool):
            current[key] = bool(value)
        elif isinstance(default, str):
            current[key] = str(value)
        else:
            try:
                current[key] = float(value)
            except (TypeError, ValueError):
                continue
    db.set_setting("autopilot", current)
    return current


def set_enabled(enabled: bool) -> Dict[str, Any]:
    current = config()
    current["enabled"] = bool(enabled)
    db.set_setting("autopilot", current)
    return current


# ---------------------------------------------------------------------------
# performance
# ---------------------------------------------------------------------------

def performance(source: str) -> Dict[str, Any]:
    """Realised paper performance from the decision ledger."""
    source = store.normalize_source(source)
    rows = db.query(
        """SELECT action, position_size, confidence, resolved, pnl, won, created_at
           FROM autopilot_decisions WHERE source = ? ORDER BY created_at DESC LIMIT 500""",
        (source,),
    )
    resolved = [row for row in rows if int(row["resolved"] or 0) == 1 and row["action"] not in ("STAND_DOWN", "WAIT")]
    wins = [row for row in resolved if int(row["won"] or 0) == 1]

    total_pnl = round(sum(float(row["pnl"] or 0.0) for row in resolved), 2)
    today = db.utc_now()[:10]
    daily_rows = [row for row in resolved if str(row["created_at"] or "")[:10] == today]
    daily_pnl = round(sum(float(row["pnl"] or 0.0) for row in daily_rows), 2)

    consecutive = 0
    for row in resolved:
        if int(row["won"] or 0) == 1:
            break
        consecutive += 1

    gains = [float(row["pnl"] or 0.0) for row in resolved if float(row["pnl"] or 0.0) > 0]
    losses = [abs(float(row["pnl"] or 0.0)) for row in resolved if float(row["pnl"] or 0.0) < 0]

    return {
        "total_trades": len(resolved),
        "daily_trades": len(daily_rows),
        "win_rate": round(len(wins) / len(resolved), 4) if resolved else 0.0,
        "total_pnl": total_pnl,
        "daily_pnl": daily_pnl,
        "consecutive_losses": consecutive,
        "avg_win": round(sum(gains) / len(gains), 2) if gains else 0.0,
        "avg_loss": round(sum(losses) / len(losses), 2) if losses else 0.0,
        "profit_factor": round(sum(gains) / sum(losses), 3) if losses and sum(losses) > 0 else None,
        "pending": sum(1 for row in rows if int(row["resolved"] or 0) == 0),
    }


def status(source: str) -> Dict[str, Any]:
    source = store.normalize_source(source)
    cfg = config()
    perf = performance(source)
    last = db.query_one(
        """SELECT * FROM autopilot_decisions WHERE source = ? ORDER BY created_at DESC LIMIT 1""",
        (source,),
    )

    open_row = db.query_one(
        "SELECT position_size FROM autopilot_decisions WHERE source = ? AND resolved = 0 ORDER BY created_at DESC LIMIT 1",
        (source,),
    )

    risk_level = "critical" if perf["consecutive_losses"] >= int(cfg["max_consecutive_losses"]) else (
        "elevated" if perf["consecutive_losses"] >= max(1, int(cfg["max_consecutive_losses"]) - 1) else "normal"
    )

    return {
        "is_active": bool(cfg["enabled"]),
        "source": source,
        "current_position": float(open_row["position_size"]) if open_row else None,
        "risk_level": risk_level,
        "last_decision": _row_to_decision(last) if last else None,
        "config": cfg,
        **perf,
    }


def _row_to_decision(row: Any) -> Dict[str, Any]:
    def _load(value: Any, fallback: Any) -> Any:
        if not value:
            return fallback
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return fallback

    return {
        "id": row["id"],
        "round_id": row["round_id"],
        "timestamp": row["created_at"],
        "action": row["action"],
        "position_size": float(row["position_size"]),
        "entry_point": float(row["entry_point"]),
        "exit_point": float(row["exit_point"]),
        "stop_loss": float(row["stop_loss"]),
        "confidence": float(row["confidence"]),
        "primary_signal": row["primary_signal"],
        "contributing_signals": _load(row["signals"], []),
        "risk_assessment": _load(row["risk"], {}),
        "resolved": bool(row["resolved"]),
        "pnl": float(row["pnl"]) if row["pnl"] is not None else None,
        "won": bool(row["won"]) if row["won"] is not None else None,
        "resolved_at": row["resolved_at"],
    }


def decisions(source: str, limit: int = 100) -> List[Dict[str, Any]]:
    rows = db.query(
        "SELECT * FROM autopilot_decisions WHERE source = ? ORDER BY created_at DESC LIMIT ?",
        (store.normalize_source(source), max(1, min(int(limit), 500))),
    )
    return [_row_to_decision(row) for row in rows]


# ---------------------------------------------------------------------------
# decision cycle
# ---------------------------------------------------------------------------

def _weighted_signals(payload: Dict[str, Any], cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Blend the three analyzer families using the configured weights."""
    signals = payload.get("signals", {})
    contributions: List[Dict[str, Any]] = []
    total_weight = 0.0
    total_score = 0.0

    if cfg["enable_ceiling_analyzer"]:
        weight = float(cfg["ceiling_analyzer_weight"])
        collapse = signals.get("collapse_ladder", {})
        resistance = signals.get("upper_resistance", {})
        # Collapse strength is a bearish input, so it reduces the composite.
        score = max(0.0, float(resistance.get("pressure", 0.0)) - float(collapse.get("strength", 0.0)) * 0.5)
        contributions.append({"name": "ceiling_analyzer", "score": round(score, 4), "weight": weight})
        total_weight += weight
        total_score += score * weight

    if cfg["enable_gap_swing_analyzer"]:
        weight = float(cfg["gap_swing_analyzer_weight"])
        swing = signals.get("gap_swing", {})
        direction = str(swing.get("direction", "flat"))
        raw = float(swing.get("swing_score", 0.0))
        score = raw if direction == "up" else (raw * 0.25 if direction == "flat" else 0.0)
        contributions.append({"name": "gap_swing_analyzer", "score": round(score, 4), "weight": weight})
        total_weight += weight
        total_score += score * weight

    if cfg["enable_linguistic_analysis"]:
        weight = float(cfg["linguistic_analysis_weight"])
        scores = payload.get("state_scores", {})
        score = max(float(scores.get("Ignition", 0.0)), float(scores.get("Moonshot", 0.0)))
        contributions.append({"name": "linguistic_analysis", "score": round(score, 4), "weight": weight})
        total_weight += weight
        total_score += score * weight

    composite = round(total_score / total_weight, 4) if total_weight > 0 else 0.0
    contributions.sort(key=lambda item: item["score"] * item["weight"], reverse=True)
    return {
        "composite": composite,
        "contributions": contributions,
        "primary": contributions[0]["name"] if contributions else "none",
    }


def evaluate(source: str, record: bool = True) -> Dict[str, Any]:
    """Run one autopilot cycle and (optionally) record the decision."""
    source = store.normalize_source(source)
    cfg = config()
    payload = store.analysis_payload(source)

    if payload.get("empty"):
        return {
            "action": "STAND_DOWN",
            "reason": "No round data available for this source.",
            "recorded": False,
            "plan": None,
            "signals": {"composite": 0.0, "contributions": [], "primary": "none"},
        }

    perf = performance(source)
    plan = orchestrator.plan(payload, perf)
    blend = _weighted_signals(payload, cfg)
    instruction = plan["instruction"]

    confidence = float(instruction["confidence"])
    action = instruction["action"]

    # The composite must agree with the orchestrator before we commit.
    if action == "ENTER" and blend["composite"] < float(cfg["min_confidence_threshold"]) * 0.6:
        action = "PREPARE"
        reason = f"Orchestrator wanted entry but analyzer composite is only {blend['composite']:.2f}."
    else:
        reason = instruction["detail"]

    latest = store.latest_round(source)
    entry = float(payload.get("latest", {}).get("multiplier") or 1.0)
    exit_point = float(instruction["target_multiplier"])
    stop_loss = float(instruction["stop_multiplier"])
    size = float(instruction["position_size"]) if action == "ENTER" else 0.0

    decision: Dict[str, Any] = {
        "action": action,
        "reason": reason,
        "position_size": size,
        "entry_point": entry,
        "exit_point": exit_point,
        "stop_loss": stop_loss,
        "confidence": confidence,
        "primary_signal": blend["primary"],
        "contributing_signals": blend["contributions"],
        "composite": blend["composite"],
        "risk_assessment": plan["risk"],
        "mistake_prevention": plan["mistake_prevention"],
        "state": payload.get("state"),
        "round_id": int(latest["id"]) if latest else None,
        "recorded": False,
    }

    if record and cfg["enabled"]:
        decision_id = db.execute(
            """INSERT INTO autopilot_decisions
               (source, round_id, created_at, action, position_size, entry_point, exit_point,
                stop_loss, confidence, primary_signal, signals, risk)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                source,
                decision["round_id"],
                db.utc_now(),
                action,
                size,
                entry,
                exit_point,
                stop_loss,
                confidence,
                blend["primary"],
                json.dumps(blend["contributions"]),
                json.dumps(plan["risk"]),
            ),
        )
        decision["id"] = decision_id
        decision["recorded"] = True

    decision["plan"] = plan
    return decision


def resolve(source: str, round_id: int, multiplier: float) -> int:
    """Settle every open decision against the round that just landed."""
    source = store.normalize_source(source)
    open_rows = db.query(
        """SELECT id, action, position_size, exit_point, stop_loss FROM autopilot_decisions
           WHERE source = ? AND resolved = 0 AND (round_id IS NULL OR round_id < ?)
           ORDER BY created_at ASC LIMIT 50""",
        (source, int(round_id)),
    )

    settled = 0
    for row in open_rows:
        action = str(row["action"])
        size = float(row["position_size"] or 0.0)
        target = float(row["exit_point"] or 0.0)

        if action != "ENTER" or size <= 0:
            pnl = 0.0
            won: Optional[int] = None
        elif float(multiplier) >= target:
            pnl = round(size * (target - 1.0), 2)
            won = 1
        else:
            pnl = round(-size, 2)
            won = 0

        db.execute(
            "UPDATE autopilot_decisions SET resolved = 1, pnl = ?, won = ?, resolved_at = ? WHERE id = ?",
            (pnl, won, db.utc_now(), int(row["id"])),
        )
        settled += 1
    return settled


def equity_curve(source: str, limit: int = 200) -> List[Dict[str, Any]]:
    """Cumulative paper P&L for the Autopilot chart."""
    rows = db.query(
        """SELECT created_at, pnl, action, confidence FROM autopilot_decisions
           WHERE source = ? AND resolved = 1 ORDER BY created_at ASC LIMIT ?""",
        (store.normalize_source(source), max(1, min(int(limit), 2000))),
    )
    equity = 0.0
    out: List[Dict[str, Any]] = []
    for index, row in enumerate(rows):
        equity = round(equity + float(row["pnl"] or 0.0), 2)
        out.append(
            {
                "index": index + 1,
                "time": row["created_at"],
                "pnl": float(row["pnl"] or 0.0),
                "equity": equity,
                "action": row["action"],
                "confidence": float(row["confidence"] or 0.0),
            }
        )
    return out


def reset(source: str) -> int:
    """Clear the decision ledger for a source (operator action)."""
    source = store.normalize_source(source)
    row = db.query_one("SELECT COUNT(*) AS c FROM autopilot_decisions WHERE source = ?", (source,))
    count = int(row["c"]) if row else 0
    db.execute("DELETE FROM autopilot_decisions WHERE source = ?", (source,))
    return count
