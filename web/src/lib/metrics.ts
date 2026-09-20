import {
  RiBatteryLine,
  RiCpuLine,
  RiRamLine,
  RiTempHotLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import type { Metric } from "../hooks/useMetrics";
import type { Threshold } from "./stats";

export type MetricConfig = {
  title: string;
  icon: RemixiconComponentType;
  /** Tailwind text colour, matching the chart series. */
  iconColor: string;
  unit: string;
  decimals: number;
  /** Omit to disable alerts for this metric. */
  threshold?: Threshold;
  /** Changes smaller than this count as flat. */
  flatBelow: number;
};

export const STALE_MS = 5_000;

export const METRICS: Record<Metric, MetricConfig> = {
  cpu: {
    title: "CPU usage",
    icon: RiCpuLine,
    iconColor: "text-cyan-500",
    unit: "%",
    decimals: 0,
    threshold: { warn: 70, danger: 90, sustainSec: 30 },
    flatBelow: 2,
  },
  memory: {
    title: "Memory usage",
    icon: RiRamLine,
    iconColor: "text-violet-500",
    unit: "%",
    decimals: 1,
    threshold: { warn: 80, danger: 90 },
    flatBelow: 1,
  },
  temperature: {
    title: "Temperature",
    icon: RiTempHotLine,
    iconColor: "text-amber-500",
    unit: "°C",
    decimals: 0,
    flatBelow: 1,
  },
  battery: {
    title: "Battery",
    icon: RiBatteryLine,
    iconColor: "text-emerald-500",
    unit: "%",
    decimals: 0,
    threshold: { warn: 30, danger: 15, lowIsBad: true },
    flatBelow: 1,
  },
};

export const fmt = (v: number, m: MetricConfig) =>
  `${v.toFixed(m.decimals)}${m.unit}`;
