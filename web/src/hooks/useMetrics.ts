import { useEffect, useState } from "react";

export type Metric = "cpu" | "memory" | "temperature" | "battery";
export type Point = { ts: number; value: number };
export type Status = "connecting" | "live" | "offline";

const METRICS: Metric[] = ["cpu", "memory", "temperature", "battery"];
const MAX_POINTS = 120;
const RECONNECT_MS = 2000;

type State = Record<Metric, Point[]>;

const empty = (): State => ({
  cpu: [],
  memory: [],
  temperature: [],
  battery: [],
});

// Union by timestamp so history and live points that overlap don't duplicate.
function merge(a: Point[], b: Point[]): Point[] {
  const byTs = new Map<number, Point>();
  for (const p of a) byTs.set(p.ts, p);
  for (const p of b) byTs.set(p.ts, p);
  return [...byTs.values()].sort((x, y) => x.ts - y.ts).slice(-MAX_POINTS);
}

export function useMetrics() {
  const [data, setData] = useState<State>(empty);
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    let ws: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const append = (metric: Metric, points: Point[]) =>
      setData((prev) => ({ ...prev, [metric]: merge(prev[metric], points) }));

    // /api/history returns newest first
    const loadHistory = () => {
      for (const metric of METRICS) {
        fetch(`/api/history?metric=${metric}`)
          .then((r) => r.json() as Promise<Point[]>)
          .then((rows) => !disposed && append(metric, rows))
          .catch(() => {});
      }
    };

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/ws`);
      ws.onopen = () => {
        setStatus("live");
        loadHistory();
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data) as Point & { metric: Metric };
        if (METRICS.includes(msg.metric)) {
          append(msg.metric, [{ ts: msg.ts, value: msg.value }]);
        }
      };
      ws.onclose = () => {
        if (disposed) return;
        setStatus("offline");
        timer = setTimeout(connect, RECONNECT_MS);
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, []);

  return { data, status };
}
