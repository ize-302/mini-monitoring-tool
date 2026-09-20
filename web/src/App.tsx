import {
  Card,
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
import { useMetrics, type Point, type Status } from "./hooks/useMetrics";

const STATUS_INTENT: Record<Status, Intent> = {
  connecting: "warning",
  live: "success",
  offline: "danger",
};

const time = (ts: number) => new Date(ts).toLocaleTimeString([], { hour12: false });

function MetricCard({
  title,
  latest,
  children,
}: {
  title: string;
  latest: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="m-0 text-sm font-medium">{title}</h3>
        <span className="text-xl font-semibold tabular-nums">{latest}</span>
      </div>
      {children}
    </Card>
  );
}

function series(points: Point[], category: string) {
  return points.map((p) => ({ time: time(p.ts), [category]: p.value }));
}

// Tremor bars take one colour per category, so split battery into level bands.
function batteryBands(points: Point[]) {
  return points.map((p) => ({
    time: time(p.ts),
    Low: p.value < 20 ? p.value : null,
    Medium: p.value >= 20 && p.value < 50 ? p.value : null,
    Good: p.value >= 50 ? p.value : null,
  }));
}

const last = (points: Point[], unit: string) =>
  points.length ? `${Math.round(points[points.length - 1]!.value)}${unit}` : "–";

export function App() {
  const { data, status } = useMetrics();
  const [dark, setDark] = useDarkMode();

  return (
    <>
      <Navbar>
        <NavbarGroup>
          <NavbarHeading>Mini monitoring tool</NavbarHeading>
          <Tag minimal intent={STATUS_INTENT[status]}>
            {status}
          </Tag>
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

      <main className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <MetricCard title="CPU usage" latest={last(data.cpu, "%")}>
          <AreaChart
            className="h-64"
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

        <MetricCard title="Memory usage" latest={last(data.memory, "%")}>
          <AreaChart
            className="h-64"
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

        <MetricCard title="Temperature" latest={last(data.temperature, "°C")}>
          <AreaChart
            className="h-64"
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

        <MetricCard title="Battery" latest={last(data.battery, "%")}>
          <BarChart
            className="h-64"
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
    </>
  );
}
