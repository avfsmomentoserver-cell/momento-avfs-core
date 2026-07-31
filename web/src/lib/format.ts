/** Display formatters. Every readout in the console goes through one of these. */

import type { MarketState } from "./types";

export function multiplier(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(digits)}x`;
}

export function percent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function decimal(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

export function integer(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Math.round(Number(value)).toLocaleString();
}

export function signed(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const num = Number(value);
  return `${num >= 0 ? "+" : ""}${num.toFixed(digits)}`;
}

export function currency(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const num = Number(value);
  return `${num < 0 ? "−" : ""}${Math.abs(num).toFixed(digits)}`;
}

export function bytes(value: number | null | undefined): string {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = Number(value);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function clockTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function relativeTime(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const ms = typeof value === "number" ? value * 1000 : new Date(value).getTime();
  if (Number.isNaN(ms)) return "—";

  const diff = Math.max(0, Date.now() - ms);
  const seconds = Math.round(diff / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function duration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "—";
  const total = Math.max(0, Math.round(Number(seconds)));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/** Tailwind text class for a market state. */
export function stateTextClass(state: MarketState | string | null | undefined): string {
  switch (state) {
    case "Moonshot":
      return "text-info";
    case "Ignition":
      return "text-signal";
    case "Collapse":
      return "text-critical";
    case "Exhaustion":
      return "text-caution";
    case "Bait":
      return "text-caution";
    case "Shelf":
      return "text-muted-foreground";
    default:
      return "text-foreground";
  }
}

/** Colour used for meters and chart strokes, keyed by market state. */
export function stateColor(state: MarketState | string | null | undefined): string {
  switch (state) {
    case "Moonshot":
      return "hsl(var(--info))";
    case "Ignition":
      return "hsl(var(--signal))";
    case "Collapse":
      return "hsl(var(--critical))";
    case "Exhaustion":
    case "Bait":
      return "hsl(var(--caution))";
    case "Shelf":
      return "hsl(var(--muted-foreground))";
    default:
      return "hsl(var(--foreground))";
  }
}

/** Colour ramp for a 0..1 strength value. */
export function strengthColor(value: number): string {
  if (value >= 0.66) return "hsl(var(--signal))";
  if (value >= 0.38) return "hsl(var(--caution))";
  return "hsl(var(--critical))";
}

/** Colour ramp for a multiplier, matching the linguistics band palette. */
export function multiplierColor(value: number): string {
  if (value >= 50) return "hsl(var(--violet))";
  if (value >= 10) return "hsl(var(--info))";
  if (value >= 5) return "hsl(var(--signal))";
  if (value >= 2) return "hsl(var(--caution))";
  return "hsl(var(--critical))";
}

export function confidenceLabel(value: number): "HIGH" | "MEDIUM" | "LOW" {
  if (value >= 0.66) return "HIGH";
  if (value >= 0.38) return "MEDIUM";
  return "LOW";
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function truncate(value: string, max = 42): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
