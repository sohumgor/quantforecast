"use client";

import type { Data } from "plotly.js";
import type { FanChartInfo } from "@shared/types";

import { usePrefersDark } from "@/lib/hooks/useColorScheme";
import { hexToRgba } from "@/lib/color";
import { tradingDayToDate } from "@/lib/interpret/format";
import { darkTokens, lightTokens } from "@/styles/tokens";

import { Plot } from "./PlotlyBase";

interface ConfidenceConeChartProps {
  fanChart: FanChartInfo;
  currentPrice: number;
  /** Forecast origin date (defaults to today) — trading-day offsets are
   * converted to real calendar dates relative to this for the x-axis. */
  startDate?: Date;
}

/** Simplified single-band (P5–P95 + median) cone — the beginner-friendly,
 * Simple-Mode view. See `MonteCarloFanChart` for the full Advanced-Mode version. */
export function ConfidenceConeChart({
  fanChart,
  currentPrice,
  startDate,
}: ConfidenceConeChartProps) {
  const prefersDark = usePrefersDark();
  const tokens = prefersDark ? darkTokens : lightTokens;
  const color = tokens.series[0];
  const origin = startDate ?? new Date();

  const x = [0, ...fanChart.horizon_days].map(
    (d) => tradingDayToDate(origin, d).toISOString().slice(0, 10),
  );
  const withOrigin = (values: number[]) => [currentPrice, ...values];
  const p5 = withOrigin(fanChart.percentiles.p5 ?? []);
  const p50 = withOrigin(fanChart.percentiles.p50 ?? []);
  const p95 = withOrigin(fanChart.percentiles.p95 ?? []);

  const finalDay = x[x.length - 1];
  const finalMedian = p50[p50.length - 1];
  const finalLow = p5[p5.length - 1];
  const finalHigh = p95[p95.length - 1];

  const data: Data[] = [
    { x, y: p5, type: "scatter", mode: "lines", line: { width: 0 }, showlegend: false, hoverinfo: "skip" },
    {
      x,
      y: p95,
      type: "scatter",
      mode: "lines",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: hexToRgba(color, 0.16),
      name: "90% of outcomes",
      hovertemplate: "%{x|%b %d, %Y}<extra></extra>",
    },
    {
      x,
      y: p50,
      type: "scatter",
      mode: "lines",
      line: { width: 3, color },
      name: "Most likely path",
      hovertemplate: "%{x|%b %d, %Y}<br>$%{y:.2f}<extra></extra>",
    },
  ];

  return (
    <Plot
      data={data}
      layout={{
        margin: { l: 52, r: 90, t: 16, b: 40 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: tokens.textSecondary, size: 13 },
        xaxis: {
          type: "date",
          tickformat: "%b %d",
          gridcolor: tokens.gridline,
          zeroline: false,
        },
        yaxis: { title: { text: "Price ($)" }, gridcolor: tokens.gridline, zeroline: false },
        showlegend: false,
        annotations: [
          {
            x: finalDay,
            y: finalHigh,
            xanchor: "left",
            text: `Best case  $${finalHigh.toFixed(0)}`,
            showarrow: false,
            font: { size: 11, color: tokens.textMuted },
            xshift: 8,
          },
          {
            x: finalDay,
            y: finalMedian,
            xanchor: "left",
            text: `Typical  $${finalMedian.toFixed(0)}`,
            showarrow: false,
            font: { size: 12, color, weight: 600 },
            xshift: 8,
          },
          {
            x: finalDay,
            y: finalLow,
            xanchor: "left",
            text: `Worst case  $${finalLow.toFixed(0)}`,
            showarrow: false,
            font: { size: 11, color: tokens.textMuted },
            xshift: 8,
          },
        ],
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ height: 320 }}
    />
  );
}
