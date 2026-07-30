"use client";

import type { Data } from "plotly.js";
import type { FanChartInfo } from "@shared/types";

import { usePrefersDark } from "@/lib/hooks/useColorScheme";
import { hexToRgba } from "@/lib/color";
import { tradingDayToDate } from "@/lib/interpret/format";
import { darkTokens, lightTokens } from "@/styles/tokens";

import { Plot } from "./PlotlyBase";

interface MonteCarloFanChartProps {
  fanChart: FanChartInfo;
  currentPrice: number;
  startDate?: Date;
}

/** Full percentile-band fan chart (P5/P25/P50/P75/P95) — the detailed,
 * Advanced-Mode view. See `ConfidenceConeChart` for the Simple-Mode variant. */
export function MonteCarloFanChart({ fanChart, currentPrice, startDate }: MonteCarloFanChartProps) {
  const prefersDark = usePrefersDark();
  const tokens = prefersDark ? darkTokens : lightTokens;
  const color = tokens.series[0];
  const origin = startDate ?? new Date();

  const x = [0, ...fanChart.horizon_days].map(
    (d) => tradingDayToDate(origin, d).toISOString().slice(0, 10),
  );
  const withOrigin = (values: number[]) => [currentPrice, ...values];
  const p5 = withOrigin(fanChart.percentiles.p5 ?? []);
  const p25 = withOrigin(fanChart.percentiles.p25 ?? []);
  const p50 = withOrigin(fanChart.percentiles.p50 ?? []);
  const p75 = withOrigin(fanChart.percentiles.p75 ?? []);
  const p95 = withOrigin(fanChart.percentiles.p95 ?? []);

  const data: Data[] = [
    { x, y: p5, type: "scatter", mode: "lines", line: { width: 0 }, showlegend: false, hoverinfo: "skip" },
    {
      x,
      y: p95,
      type: "scatter",
      mode: "lines",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: hexToRgba(color, 0.12),
      name: "5th–95th percentile",
      hoverinfo: "skip",
    },
    { x, y: p25, type: "scatter", mode: "lines", line: { width: 0 }, showlegend: false, hoverinfo: "skip" },
    {
      x,
      y: p75,
      type: "scatter",
      mode: "lines",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: hexToRgba(color, 0.24),
      name: "25th–75th percentile",
      hoverinfo: "skip",
    },
    {
      x,
      y: p50,
      type: "scatter",
      mode: "lines",
      line: { width: 2, color },
      name: "Median forecast",
      hovertemplate: "%{x|%b %d, %Y}<br>Median: $%{y:.2f}<extra></extra>",
    },
  ];

  return (
    <Plot
      data={data}
      layout={{
        margin: { l: 52, r: 16, t: 16, b: 40 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: tokens.textSecondary, size: 12 },
        xaxis: { type: "date", tickformat: "%b %d", gridcolor: tokens.gridline, zeroline: false },
        yaxis: { title: { text: "Price ($)" }, gridcolor: tokens.gridline, zeroline: false },
        legend: { orientation: "h", y: -0.22, font: { size: 11 } },
        hovermode: "x unified",
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ height: 320 }}
    />
  );
}
