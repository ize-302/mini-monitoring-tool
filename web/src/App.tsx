import {
  Callout,
  Card,
  Icon,
  Navbar,
  NavbarGroup,
  NavbarHeading,
  Switch,
  Tag,
  type Intent,
} from "@blueprintjs/core";
import { AreaChart } from "./components/AreaChart/AreaChart";
import { BarChart } from "./components/BarChart/BarChart";
import { useDarkMode } from "./hooks/useDarkMode";
import {
  useMetrics,
  type Metric,
  type Point,
  type Status,
} from "./hooks/useMetrics";
import { useNow } from "./hooks/useNow";
import { fmt, METRICS, STALE_MS, type MetricConfig } from "./lib/metrics";
import { levelOf, summarize, trend, type Level } from "./lib/stats";

const STATUS_INTENT: Record<Status, Intent> = {
  connecting: "warning",
  live: "success",
  offline: "danger",
};

const LEVEL_TEXT: Record<Level, string> = {
  ok: "",
  warn: "text-amber-500",
  danger: "text-red-500",
};

const LEVEL_LABEL: Record<Level, string> = {
  ok: "",
  warn: "Warning",
  danger: "Critical",
};

const time = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour12: false });

// Charts draw only the most recent readings; stats and alerts use the full window.
const AREA_POINTS = 60;
const BATTERY_POINTS = 30;

function series(points: Point[], category: string) {
  return points
    .slice(-AREA_POINTS)
    .map((p) => ({ time: time(p.ts), [category]: p.value }));
}

// Tremor bars take one colour per category, so split battery into level bands.
function batteryBands(points: Point[]) {
  return points.slice(-BATTERY_POINTS).map((p) => ({
    time: time(p.ts),
    Low: p.value < 20 ? p.value : null,
    Medium: p.value >= 20 && p.value < 50 ? p.value : null,
    Good: p.value >= 50 ? p.value : null,
  }));
}

function Trend({ delta, cfg }: { delta: number | null; cfg: MetricConfig }) {
  if (delta === null) return null;
  const flat = Math.abs(delta) < cfg.flatBelow;
  const up = delta > 0;
  // "Worse" is up for usage/temperature, down for battery.
  const worse = !flat && up !== !!cfg.threshold?.lowIsBad;
  const color = flat
    ? "text-gray-500"
    : worse
      ? "text-amber-500"
      : "text-emerald-500";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs tabular-nums ${color}`}
      title="Change vs. average of the previous minute"
    >
      <Icon
        icon={flat ? "arrow-right" : up ? "arrow-up" : "arrow-down"}
        size={12}
      />
      {flat ? "steady" : `${Math.abs(delta).toFixed(1)}${cfg.unit}`}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

function MetricCard({
  metric,
  points,
  now,
  children,
}: {
  metric: Metric;
  points: Point[];
  now: number;
  children: React.ReactNode;
}) {
  const cfg = METRICS[metric];
  const latest = points[points.length - 1];
  const summary = summarize(points);
  const level = cfg.threshold ? levelOf(points, cfg.threshold) : "ok";
  const age = latest ? now - latest.ts : Infinity;
  const stale = age > STALE_MS;

  return (
    <Card className="flex min-h-72 flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <cfg.icon
              className={`size-5 shrink-0 ${cfg.iconColor}`}
              aria-hidden
            />
            <h3 className="m-0 text-sm font-medium">{cfg.title}</h3>
            {level !== "ok" && (
              <Tag minimal intent={level === "danger" ? "danger" : "warning"}>
                {LEVEL_LABEL[level]}
              </Tag>
            )}
            {stale && (
              <Tag minimal intent="danger" icon="offline">
                {latest ? `stale ${Math.round(age / 1000)}s` : "no data"}
              </Tag>
            )}
          </div>
          <Trend delta={trend(points)} cfg={cfg} />
        </div>
        <span
          className={`text-3xl font-semibold tabular-nums ${LEVEL_TEXT[level]} ${stale ? "opacity-40" : ""}`}
        >
          {latest ? fmt(latest.value, cfg) : "–"}
        </span>
      </div>

      {summary && (
        <div className="flex gap-6">
          <Stat label="min" value={fmt(summary.min, cfg)} />
          <Stat label="avg" value={fmt(summary.avg, cfg)} />
          <Stat label="p95" value={fmt(summary.p95, cfg)} />
          <Stat label="max" value={fmt(summary.max, cfg)} />
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div className={`absolute inset-0 ${stale ? "opacity-40" : ""}`}>
          {children}
        </div>
      </div>
    </Card>
  );
}

export function App() {
  const { data, status } = useMetrics();
  const [dark, setDark] = useDarkMode();
  const now = useNow();

  const critical = (Object.keys(METRICS) as Metric[]).filter((m) => {
    const t = METRICS[m].threshold;
    return t !== undefined && levelOf(data[m], t) === "danger";
  });

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <Navbar className="shrink-0">
        <NavbarGroup>
          <NavbarHeading>Mini monitoring tool</NavbarHeading>
          <Tag intent={STATUS_INTENT[status]}>{status}</Tag>
        </NavbarGroup>
        <NavbarGroup align="right">
          <Switch
            className="!mb-0"
            label="Dark"
            checked={dark}
            onChange={(e) => setDark(e.currentTarget.checked)}
          />
        </NavbarGroup>
      </Navbar>

      {critical.length > 0 && (
        <Callout
          intent="danger"
          icon="warning-sign"
          className="mx-4 mt-4 shrink-0"
        >
          {critical
            .map((m) => {
              const cfg = METRICS[m];
              const v = data[m][data[m].length - 1]!.value;
              const t = cfg.threshold!;
              return `${cfg.title} ${fmt(v, cfg)} (${t.lowIsBad ? "below" : "above"} ${fmt(t.danger, cfg)})`;
            })
            .join(" · ")}
        </Callout>
      )}

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-2 lg:grid-rows-2">
        <MetricCard metric="cpu" points={data.cpu} now={now}>
          <AreaChart
            className="h-full"
            data={series(data.cpu, "CPU")}
            index="time"
            categories={["CPU"]}
            colors={["cyan"]}
            minValue={0}
            maxValue={100}
            valueFormatter={(v) => `${v.toFixed(1)}%`}
            showLegend={false}
          />
        </MetricCard>

        <MetricCard metric="memory" points={data.memory} now={now}>
          <AreaChart
            className="h-full"
            data={series(data.memory, "Memory")}
            index="time"
            categories={["Memory"]}
            colors={["violet"]}
            curve="monotone"
            minValue={0}
            maxValue={100}
            valueFormatter={(v) => `${v.toFixed(1)}%`}
            showLegend={false}
          />
        </MetricCard>

        <MetricCard metric="temperature" points={data.temperature} now={now}>
          <AreaChart
            className="h-full"
            data={series(data.temperature, "Temperature")}
            index="time"
            categories={["Temperature"]}
            colors={["amber"]}
            curve="monotone"
            minValue={0}
            valueFormatter={(v) => `${v.toFixed(1)}°C`}
            showLegend={false}
          />
        </MetricCard>

        <MetricCard metric="battery" points={data.battery} now={now}>
          <BarChart
            className="h-full"
            data={batteryBands(data.battery)}
            index="time"
            categories={["Low", "Medium", "Good"]}
            colors={["red", "amber", "emerald"]}
            type="stacked"
            minValue={0}
            maxValue={100}
            valueFormatter={(v) => `${v}%`}
          />
        </MetricCard>
      </main>
    </div>
  );
}
