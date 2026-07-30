"use client";

import type { Data } from "plotly.js";
import type { BacktestWindowPoint } from "@shared/types";

import { usePrefersDark } from "@/lib/hooks/useColorScheme";
import { hexToRgba } from "@/lib/color";
import { darkTokens, lightTokens } from "@/styles/tokens";

import { Plot } from "./PlotlyBase";

interface BacktestTimelineChartProps {
  points: BacktestWindowPoint[];
}

/** The backtest page's primary chart: at each rolling forecast origin, shows
 * what the model predicted (median + 5th-95th percentile band) against what
 * actually happened — the most direct visual answer to "how close was the
 * model?" */
export function BacktestTimelineChart({ points }: BacktestTimelineChartProps) {
  const prefersDark = usePrefersDark();
  const tokens = prefersDark ? darkTokens : lightTokens;
  const forecastColor = tokens.series[0];
  const actualColor = tokens.series[1];

  const x = points.map((p) => p.window_origin);
  const p5 = points.map((p) => p.forecast_p5_price);
  const p95 = points.map((p) => p.forecast_p95_price);
  const median = points.map((p) => p.forecast_median_price);
  const actual = points.map((p) => p.actual_price);

  const data: Data[] = [
    {
      x,
      y: p5,
      type: "scatter",
      mode: "lines",
      line: { width: 0 },
      showlegend: false,
      hoverinfo: "skip",
    },
    {
      x,
      y: p95,
      type: "scatter",
      mode: "lines",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: hexToRgba(forecastColor, 0.16),
      name: "Model's predicted range (5th-95th percentile)",
      hoverinfo: "skip",
    },
    {
      x,
      y: median,
      type: "scatter",
      mode: "lines",
      line: { width: 2, color: forecastColor, dash: "dot" },
      name: "Predicted median",
      hovertemplate: "Predicted: $%{y:.2f}<extra></extra>",
    },
    {
      x,
      y: actual,
      type: "scatter",
      mode: "lines+markers",
      line: { width: 2, color: actualColor },
      marker: { size: 5, color: actualColor },
      name: "What actually happened",
      hovertemplate: "Actual: $%{y:.2f}<extra></extra>",
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
        xaxis: { type: "date", tickformat: "%b %Y", gridcolor: tokens.gridline, zeroline: false },
        yaxis: { title: { text: "Price ($)" }, gridcolor: tokens.gridline, zeroline: false },
        legend: { orientation: "h", y: -0.2, font: { size: 11 } },
        hovermode: "x unified",
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ height: 360 }}
    />
  );
}
