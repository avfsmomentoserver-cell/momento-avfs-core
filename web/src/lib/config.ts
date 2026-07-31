/**
 * Runtime configuration for the AVFS / Momento Core console.
 *
 * The backend is a Python FastAPI service. The API URL is overridable via
 * VITE_API_BASE_URL environment variable to support:
 * - Local development: http://localhost:8000
 * - Remote access: http://PUBLIC_IP:8000
 * - Reverse proxy deployments: https://your-domain.com
 */

const DEFAULT_API = "http://localhost:8000";

function resolveApiBase(): string {
  // Explicit environment variable takes highest priority
  const explicit = import.meta.env.VITE_API_BASE_URL;
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return explicit.trim().replace(/\/$/, "");
  }

  // When accessed remotely, use the remote IP for API
  if (typeof window !== "undefined") {
    const { origin, hostname, port } = window.location;
    const isDevServer = port === "8080" || port === "5173" || port === "4173";
    
    // If accessing from a remote IP, use that IP for the API
    if (isDevServer && (hostname !== "localhost" && hostname !== "127.0.0.1")) {
      return `http://${hostname}:8000`;
    }
    
    // When served behind the same origin as the API (nginx / systemd deployment),
    // prefer the current origin so no configuration is required.
    if (!isDevServer && origin.startsWith("http")) {
      return origin.replace(/\/$/, "");
    }
  }

  return DEFAULT_API;
}

function resolveWsUrl(apiBase: string): string {
  const explicit = import.meta.env.VITE_WS_URL;
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return explicit.trim();
  }
  return `${apiBase.replace(/^http/, "ws")}/ws`;
}

export const API_BASE_URL: string = resolveApiBase();
export const WS_URL: string = resolveWsUrl(API_BASE_URL);
export const API_PREFIX = "/api/v1" as const;

/** Poll intervals (ms). WebSocket is primary; polling is the safety net. */
export const POLL = {
  analysis: 4000,
  rounds: 6000,
  health: 15000,
  slow: 30000,
} as const;

export const STORAGE_KEYS = {
  token: "momento.token",
  source: "momento.source",
  session: "momento.session.cache",
  widgets: "momento.widgets",
} as const;

export const PLATFORM = {
  name: "Momento Core",
  suite: "AVFS",
  version: "2.0.0",
  tagline: "Ingest · Analyse · Forecast · Orchestrate",
} as const;
