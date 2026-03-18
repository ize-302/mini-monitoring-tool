## Mini monitoring tool

Personal monitoring tool for my linux setup. Think of a simplified version of Grafana + Prometheus but fully local.

## System architecture

```
Metric collectors (Zig)
  main.zig        → ticker loop (250ms aligned)
  cpu.zig         → reads /proc/stat           → POST /api/metrics/cpu
  memory.zig      → reads /proc/meminfo        → POST /api/metrics/memory
  temperature.zig → reads /sys/class/thermal   → POST /api/metrics/temperature
  battery.zig     → reads /sys/class/power_supply/BAT0/capacity → POST /api/metrics/battery
        │
        │ POST JSON every 250ms
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
  - Memory spline-area chart
  - Temperature spline-area chart
  - Battery column chart (color-coded by level)
```

## Stack

| Layer | Tech | Role |
|-------|------|------|
| Collector | Zig | Reads Linux `/proc` and `/sys` pseudofiles, POSTs metrics every 250ms |
| API | Bun + TypeScript | HTTP + WebSocket server, persists metrics to SQLite |
| Storage | SQLite (WAL mode) | Time-series storage, auto-purges data older than 1 day |
| Dashboard | HTML + CanvasJS | Real-time charts over WebSocket |

## Metrics collected

- **CPU usage** — percentage calculated from `/proc/stat` (two-sample delta)
- **Memory usage** — percentage from `MemTotal` / `MemAvailable` in `/proc/meminfo`
- **Temperature** — CPU thermal zone in °C from `/sys/class/thermal/thermal_zone0/temp`
- **Battery** — charge percentage from `/sys/class/power_supply/BAT0/capacity`

## API

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/metrics/cpu` | Ingest CPU usage |
| `POST` | `/api/metrics/memory` | Ingest memory usage |
| `POST` | `/api/metrics/temperature` | Ingest temperature |
| `POST` | `/api/metrics/battery` | Ingest battery level |
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

This starts the Bun API server, then waits for it to be ready before launching the Zig collector process (which runs all four collectors on a 250ms tick via `main.zig`).

3. Open the dashboard at `http://localhost:2697/web`
