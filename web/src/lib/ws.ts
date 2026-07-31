/**
 * WebSocket transport with exponential-backoff reconnect.
 *
 * A single shared socket multiplexes every live channel. Components subscribe
 * by envelope type; the transport owns the connection lifecycle.
 */

import { WS_URL } from "./config";
import type { WsEnvelope } from "./types";

type MessageHandler = (envelope: WsEnvelope) => void;
type StatusHandler = (connected: boolean) => void;

const MAX_BACKOFF_MS = 20000;
const BASE_BACKOFF_MS = 900;

class WsTransport {
  private socket: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private statusHandlers = new Set<StatusHandler>();
  private reconnectTimer: number | null = null;
  private attempts = 0;
  private manuallyClosed = false;
  private source = "aviator";
  private lastMessageAt = 0;

  connect(source?: string): void {
    if (source) this.source = source;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.manuallyClosed = false;

    try {
      const url = `${WS_URL}?source=${encodeURIComponent(this.source)}`;
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.onopen = () => {
        this.attempts = 0;
        this.lastMessageAt = Date.now();
        this.notifyStatus(true);
        this.send("subscribe", { source: this.source });
      };

      socket.onclose = () => {
        this.notifyStatus(false);
        this.socket = null;
        if (!this.manuallyClosed) this.scheduleReconnect();
      };

      socket.onerror = () => {
        // `onclose` always follows, which is where reconnect is scheduled.
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        this.lastMessageAt = Date.now();
        try {
          const envelope = JSON.parse(event.data) as WsEnvelope;
          this.dispatch(envelope);
        } catch {
          // Ignore malformed frames rather than tearing down the socket.
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.notifyStatus(false);
  }

  /** Re-subscribe the shared socket to a different data source. */
  switchSource(source: string): void {
    this.source = source;
    if (this.isConnected()) {
      this.send("source:change", { source });
    } else {
      this.connect(source);
    }
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    const set = this.handlers.get(type) ?? new Set<MessageHandler>();
    set.add(handler);
    this.handlers.set(type, set);
    return () => {
      const current = this.handlers.get(type);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) this.handlers.delete(type);
    };
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.isConnected());
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  secondsSinceMessage(): number {
    if (!this.lastMessageAt) return Number.POSITIVE_INFINITY;
    return (Date.now() - this.lastMessageAt) / 1000;
  }

  private dispatch(envelope: WsEnvelope): void {
    this.handlers.get(envelope.type)?.forEach((handler) => handler(envelope));
    this.handlers.get("*")?.forEach((handler) => handler(envelope));
  }

  private notifyStatus(connected: boolean): void {
    this.statusHandlers.forEach((handler) => handler(connected));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.attempts += 1;
    const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.min(this.attempts - 1, 5));
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

export const wsTransport = new WsTransport();
