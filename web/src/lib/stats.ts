import type { Point } from "../hooks/useMetrics";

export type Summary = { min: number; avg: number; max: number; p95: number };
export type Level = "ok" | "warn" | "danger";
export type Threshold = {
  warn: number;
  danger: number;
  /** Lower values are worse (battery). */
  lowIsBad?: boolean;
  /** Level only trips when every reading in this window is past the limit. */
  sustainSec?: number;
};

export function summarize(points: Point[]): Summary | null {
  if (!points.length) return null;
  const values = points.map((p) => p.value).sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    min: values[0]!,
    avg: sum / values.length,
    max: values[values.length - 1]!,
    p95: values[Math.ceil(0.95 * values.length) - 1]!,
  };
}

/** Latest value minus the mean of the preceding `windowMs`. Null until there's enough history. */
export function trend(points: Point[], windowMs = 60_000): number | null {
  const latest = points[points.length - 1];
  if (!latest) return null;
  const prev = points.filter(
    (p) => p.ts >= latest.ts - windowMs && p.ts < latest.ts,
  );
  if (prev.length < 5) return null;
  return latest.value - prev.reduce((a, p) => a + p.value, 0) / prev.length;
}

export function levelOf(points: Point[], t: Threshold): Level {
  const latest = points[points.length - 1];
  if (!latest) return "ok";
  const from = latest.ts - (t.sustainSec ?? 0) * 1000;
  const window = points.filter((p) => p.ts >= from).map((p) => p.value);
  if (t.lowIsBad) {
    const best = Math.max(...window);
    return best < t.danger ? "danger" : best < t.warn ? "warn" : "ok";
  }
  const worst = Math.min(...window);
  return worst >= t.danger ? "danger" : worst >= t.warn ? "warn" : "ok";
}
