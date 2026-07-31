"""WebSocket broadcast hub.

A single async connection manager shared by every route. Messages follow the
`{"type": "...", "payload": {...}, "timestamp": "..."}` envelope the dashboards
already understand.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket

logger = logging.getLogger("momento.hub")


class Hub:
    """Tracks live sockets and fans messages out to them."""

    def __init__(self) -> None:
        self._clients: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._sent = 0

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Remember the API event loop so sync code can schedule broadcasts."""
        self._loop = loop

    @property
    def client_count(self) -> int:
        return len(self._clients)

    @property
    def messages_sent(self) -> int:
        return self._sent

    async def connect(self, socket: WebSocket) -> None:
        await socket.accept()
        async with self._lock:
            self._clients.add(socket)
        logger.info("websocket connected (clients=%d)", len(self._clients))

    async def disconnect(self, socket: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(socket)
        logger.info("websocket disconnected (clients=%d)", len(self._clients))

    async def broadcast(self, message_type: str, payload: Any) -> None:
        """Send one envelope to every connected client, dropping dead sockets."""
        if not self._clients:
            return
        envelope = {
            "type": message_type,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
        }
        async with self._lock:
            targets: List[WebSocket] = list(self._clients)

        dead: List[WebSocket] = []
        for socket in targets:
            try:
                await socket.send_json(envelope)
                self._sent += 1
            except Exception:
                dead.append(socket)

        if dead:
            async with self._lock:
                for socket in dead:
                    self._clients.discard(socket)

    def broadcast_threadsafe(self, message_type: str, payload: Any) -> None:
        """Schedule a broadcast from a non-async thread (the file watcher)."""
        if self._loop is None or self._loop.is_closed():
            return
        try:
            asyncio.run_coroutine_threadsafe(self.broadcast(message_type, payload), self._loop)
        except RuntimeError:
            logger.debug("event loop unavailable, dropping %s broadcast", message_type)

    def stats(self) -> Dict[str, Any]:
        return {"clients": self.client_count, "messages_sent": self._sent}


hub = Hub()
