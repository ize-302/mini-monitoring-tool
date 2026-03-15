## Mini monitoring tool

Personal monitoring tool for my linux setup. Think of a simplified version of Grafana + Prometheus but fully local.

## System architecture

```
Metric collectors (Zig)
  cpu.zig       → reads /proc/stat           → POST /api/metrics/cpu
  memory.zig    → reads /proc/meminfo        → POST /api/metrics/memory
  temperature.zig → reads /sys/class/thermal → POST /api/metrics/temperature
        │
        │ POST JSON every 1s
        ▼
Bun HTTP server (service/index.ts) :2697
        │
        ├── INSERT INTO SQLite (metrics.db)
        │
        └── broadcast via WebSocket (/ws)
        │
        ▼
Web dashboard (web/index.html) at /web
  - CPU area chart
  - Memory step-area chart
  - Temperature column chart
```

## Stack

| Layer | Tech | Role |
|-------|------|------|
| Collector | Zig | Reads Linux `/proc` and `/sys` pseudofiles, POSTs metrics every second |
| API | Bun + TypeScript | HTTP + WebSocket server, persists metrics to SQLite |
| Storage | SQLite (WAL mode) | Time-series storage, auto-purges data older than 1 day |
| Dashboard | HTML + CanvasJS | Real-time charts over WebSocket |

## Metrics collected

- **CPU usage** — percentage calculated from `/proc/stat` (two-sample delta)
- **Memory usage** — percentage from `MemTotal` / `MemAvailable` in `/proc/meminfo`
- **Temperature** — CPU thermal zone in °C from `/sys/class/thermal/thermal_zone0/temp`

## API

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/metrics/cpu` | Ingest CPU usage |
| `POST` | `/api/metrics/memory` | Ingest memory usage |
| `POST` | `/api/metrics/temperature` | Ingest temperature |
| `GET` | `/api/history?metric=<name>` | Last 200 data points for a metric |
| `WS` | `/ws` | Real-time broadcast of all incoming metrics |
| `GET` | `/web` | Web dashboard |

## How to run

1. Install service dependencies:

```sh
cd service && bun install
```

2. Start everything from the project root:

```sh
bash ./script.sh
```

This starts the Bun API server, then waits for it to be ready before launching all three Zig collectors in parallel.

3. Open the dashboard at `http://localhost:2697/web`
