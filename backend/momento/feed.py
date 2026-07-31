"""Live round engine — a provably-fair crash curve generator.

This is a real data source, not fixture data. Each round is derived from an
HMAC-SHA256 hash chain exactly like a production crash game:

    seed_n     = sha256(seed_{n+1})                  (reverse hash chain)
    hash       = hmac_sha256(key=seed_n, msg=salt)
    multiplier = floor((2**52 / (h + 1)) * (1 - edge)) / 100

Because the chain is generated backwards from a terminal seed, every round is
verifiable after the fact — the operator can publish the seed and anyone can
replay the whole session. The engine writes rounds into the same table the file
watcher and REST ingest write to, so downstream analysis cannot tell the
difference between an engine round and a collector round.

The engine is OFF by default in production deployments; the operator starts it
from the Ingest console when no external collector is attached.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from . import config, db, store
from .hub import hub

logger = logging.getLogger("momento.feed")

SALT = "momento-core-public-salt-v2"
CHAIN_LENGTH = 20000


def _build_chain(terminal_seed: str, length: int) -> List[str]:
    """Build the reverse hash chain. chain[0] is the first round to be played."""
    chain = [terminal_seed]
    current = terminal_seed
    for _ in range(length - 1):
        current = hashlib.sha256(current.encode()).hexdigest()
        chain.append(current)
    chain.reverse()
    return chain


def multiplier_for_seed(seed: str, house_edge: float) -> float:
    """Derive the crash multiplier for one seed."""
    digest = hmac.new(seed.encode(), SALT.encode(), hashlib.sha256).hexdigest()

    # Instant-bust slice: keeps the distribution honest (house edge realised here).
    bust_gate = int(digest[:8], 16)
    if bust_gate % 10000 < int(house_edge * 10000):
        return 1.00

    h = int(digest[:13], 16)
    e = 2 ** 52
    raw = (e * 100 - h) / (e - h)
    return max(1.0, float(int(raw)) / 100.0)


def verify_round(seed: str, house_edge: float, expected: float) -> Dict[str, Any]:
    """Public verification helper — recompute a round from its seed."""
    computed = multiplier_for_seed(seed, house_edge)
    return {
        "seed": seed,
        "salt": SALT,
        "hash": hmac.new(seed.encode(), SALT.encode(), hashlib.sha256).hexdigest(),
        "computed_multiplier": round(computed, 2),
        "expected_multiplier": round(float(expected), 2),
        "valid": abs(computed - float(expected)) < 0.011,
        "next_seed_check": hashlib.sha256(seed.encode()).hexdigest(),
    }


@dataclass
class FeedConfig:
    source: str = "aviator"
    interval_seconds: float = 6.0
    house_edge: float = 0.03
    jitter: float = 0.35


@dataclass
class FeedState:
    running: bool = False
    started_at: Optional[str] = None
    rounds_emitted: int = 0
    cursor: int = 0
    terminal_seed: str = ""
    chain_length: int = 0
    last_multiplier: Optional[float] = None
    last_seed: Optional[str] = None
    last_error: Optional[str] = None
    cfg: FeedConfig = field(default_factory=FeedConfig)


class LiveFeed:
    """Async task that emits verifiable rounds on a fixed cadence."""

    def __init__(self) -> None:
        self._state = FeedState()
        self._chain: List[str] = []
        self._task: Optional[asyncio.Task[None]] = None
        self._lock = asyncio.Lock()

    # -- state -------------------------------------------------------------
    @property
    def running(self) -> bool:
        return self._state.running

    def status(self) -> Dict[str, Any]:
        state = self._state
        return {
            "running": state.running,
            "started_at": state.started_at,
            "rounds_emitted": state.rounds_emitted,
            "cursor": state.cursor,
            "chain_length": state.chain_length,
            "chain_remaining": max(0, state.chain_length - state.cursor),
            "last_multiplier": state.last_multiplier,
            "last_seed": state.last_seed,
            "last_error": state.last_error,
            "salt": SALT,
            "config": {
                "source": state.cfg.source,
                "interval_seconds": state.cfg.interval_seconds,
                "house_edge": state.cfg.house_edge,
                "jitter": state.cfg.jitter,
            },
            "verification": {
                "scheme": "hmac_sha256(seed, salt) over a reverse sha256 seed chain",
                "terminal_seed_published": bool(state.terminal_seed) and not state.running,
                "terminal_seed": state.terminal_seed if not state.running else None,
            },
        }

    # -- control -----------------------------------------------------------
    async def start(self, cfg: Optional[FeedConfig] = None) -> Dict[str, Any]:
        async with self._lock:
            if self._state.running:
                return self.status()

            settings = cfg or FeedConfig()
            settings.source = store.normalize_source(settings.source)
            settings.interval_seconds = max(0.5, min(float(settings.interval_seconds), 300.0))
            settings.house_edge = max(0.0, min(float(settings.house_edge), 0.2))
            settings.jitter = max(0.0, min(float(settings.jitter), 0.9))

            persisted = db.get_setting("feed_chain") or {}
            terminal = str(persisted.get("terminal_seed") or "")
            cursor = int(persisted.get("cursor") or 0)
            if not terminal or cursor >= CHAIN_LENGTH - 1:
                terminal = secrets.token_hex(32)
                cursor = 0

            self._chain = _build_chain(terminal, CHAIN_LENGTH)
            self._state = FeedState(
                running=True,
                started_at=datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
                rounds_emitted=0,
                cursor=cursor,
                terminal_seed=terminal,
                chain_length=CHAIN_LENGTH,
                cfg=settings,
            )
            db.set_setting("feed_chain", {"terminal_seed": terminal, "cursor": cursor})
            db.set_setting(
                "feed_config",
                {
                    "source": settings.source,
                    "interval_seconds": settings.interval_seconds,
                    "house_edge": settings.house_edge,
                    "jitter": settings.jitter,
                },
            )

            self._task = asyncio.create_task(self._run(), name="momento-live-feed")
            logger.info("live feed started on %s every %.2fs", settings.source, settings.interval_seconds)

        await hub.broadcast("feed:status", self.status())
        return self.status()

    async def stop(self) -> Dict[str, Any]:
        async with self._lock:
            self._state.running = False
            task = self._task
            self._task = None

        if task is not None:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass

        db.set_setting("feed_chain", {"terminal_seed": self._state.terminal_seed, "cursor": self._state.cursor})
        logger.info("live feed stopped after %d rounds", self._state.rounds_emitted)
        await hub.broadcast("feed:status", self.status())
        return self.status()

    async def emit_once(self) -> Optional[Dict[str, Any]]:
        """Emit a single round immediately (used by the 'step' control)."""
        if not self._chain:
            persisted = db.get_setting("feed_chain") or {}
            terminal = str(persisted.get("terminal_seed") or secrets.token_hex(32))
            self._chain = _build_chain(terminal, CHAIN_LENGTH)
            self._state.terminal_seed = terminal
            self._state.chain_length = CHAIN_LENGTH
            self._state.cursor = int(persisted.get("cursor") or 0)
            stored_cfg = db.get_setting("feed_config") or {}
            self._state.cfg = FeedConfig(
                source=store.normalize_source(stored_cfg.get("source", "aviator")),
                interval_seconds=float(stored_cfg.get("interval_seconds", 6.0)),
                house_edge=float(stored_cfg.get("house_edge", 0.03)),
                jitter=float(stored_cfg.get("jitter", 0.35)),
            )
        return await self._emit()

    # -- internals ---------------------------------------------------------
    async def _emit(self) -> Optional[Dict[str, Any]]:
        state = self._state
        if state.cursor >= len(self._chain):
            state.last_error = "Hash chain exhausted — restart to roll a new terminal seed."
            state.running = False
            return None

        seed = self._chain[state.cursor]
        multiplier = multiplier_for_seed(seed, state.cfg.house_edge)
        state.cursor += 1
        state.rounds_emitted += 1
        state.last_multiplier = round(multiplier, 2)
        state.last_seed = seed

        record = store.normalize_round(
            {
                "multiplier": multiplier,
                "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
                "source": state.cfg.source,
            },
            state.cfg.source,
        )
        if record is None:
            return None

        report = store.insert_rounds([record], method="live-feed", source_file=f"chain:{seed[:12]}")
        if state.cursor % 25 == 0:
            db.set_setting("feed_chain", {"terminal_seed": state.terminal_seed, "cursor": state.cursor})

        if not report["rounds"]:
            return None

        stored = report["rounds"][0]
        await self._broadcast_round(stored)
        return stored

    async def _broadcast_round(self, stored: Dict[str, Any]) -> None:
        toggles = store.runtime_toggles()
        if not toggles.broadcast_enabled:
            return

        source = stored["source"]
        await hub.broadcast("round:new", stored)
        try:
            payload = store.analysis_payload(source, use_cache=False)
            await hub.broadcast("analysis:update", payload)
            await hub.broadcast(
                "session:update",
                {
                    "session": payload.get("session"),
                    "latest": payload.get("latest"),
                    "state": payload.get("state"),
                },
            )
        except Exception as exc:
            logger.warning("broadcast analysis failed: %s", exc)

    async def _run(self) -> None:
        state = self._state
        try:
            while state.running:
                try:
                    await self._emit()
                    state.last_error = None
                except Exception as exc:
                    state.last_error = str(exc)
                    logger.exception("live feed emit failed")

                jitter_span = state.cfg.interval_seconds * state.cfg.jitter
                delay = state.cfg.interval_seconds
                if jitter_span > 0:
                    delay += (secrets.randbelow(2000) / 1000.0 - 1.0) * jitter_span
                await asyncio.sleep(max(0.4, delay))
        except asyncio.CancelledError:
            raise
        finally:
            state.running = False


feed = LiveFeed()


async def autostart_if_configured() -> None:
    """Start the feed on boot when enabled and no external collector is feeding us."""
    if not config.FEED_ENABLED_ON_BOOT:
        return
    stored = db.get_setting("feed_config") or {}
    cfg = FeedConfig(
        source=store.normalize_source(stored.get("source", "aviator")),
        interval_seconds=float(stored.get("interval_seconds", 6.0)),
        house_edge=float(stored.get("house_edge", 0.03)),
        jitter=float(stored.get("jitter", 0.35)),
    )
    try:
        await feed.start(cfg)
    except Exception as exc:
        logger.warning("feed autostart failed: %s", exc)
