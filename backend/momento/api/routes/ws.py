"""WebSocket endpoint.

Clients connect to `/ws`, immediately receive a snapshot, then get pushed
`round:new`, `rounds:update`, `analysis:update`, `session:update`,
`feed:status` and `autopilot:*` envelopes as they happen.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from ... import autopilot as autopilot_engine
from ... import store
from ...feed import feed
from ...hub import hub

logger = logging.getLogger("momento.ws")

router = APIRouter()


def _snapshot(source: str) -> Dict[str, Any]:
    payload = store.analysis_payload(source)
    rounds = store.get_rounds(source, limit=100, order="desc")
    return {
        "source": source,
        "analysis": payload,
        "rounds": rounds["rounds"],
        "total": rounds["total"],
        "feed": feed.status(),
        "sources": store.list_sources(),
    }


@router.websocket("/ws")
async def websocket_endpoint(socket: WebSocket, source: str = Query(default="aviator")) -> None:
    normalized = store.normalize_source(source)
    await hub.connect(socket)

    try:
        await socket.send_json({"type": "connection:status", "payload": {"connected": True, "source": normalized}})
        await socket.send_json({"type": "snapshot", "payload": _snapshot(normalized)})

        while True:
            try:
                message = await asyncio.wait_for(socket.receive_json(), timeout=30.0)
            except asyncio.TimeoutError:
                await socket.send_json({"type": "ping", "payload": {"clients": hub.client_count}})
                continue

            kind = str(message.get("type") or "")
            payload = message.get("payload") or {}
            requested = store.normalize_source(payload.get("source") or normalized)

            if kind in ("subscribe", "source:change"):
                normalized = requested
                await socket.send_json({"type": "snapshot", "payload": _snapshot(normalized)})
            elif kind == "refresh":
                await socket.send_json({"type": "analysis:update", "payload": store.analysis_payload(requested, use_cache=False)})
            elif kind == "autopilot:evaluate":
                decision = autopilot_engine.evaluate(requested, record=False)
                await socket.send_json({"type": "autopilot:decision", "payload": decision})
            elif kind == "ping":
                await socket.send_json({"type": "pong", "payload": {"clients": hub.client_count}})

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("websocket closed with error: %s", exc)
    finally:
        await hub.disconnect(socket)
