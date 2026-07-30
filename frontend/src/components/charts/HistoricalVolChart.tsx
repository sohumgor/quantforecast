"use client";

import type { Data } from "plotly.js";
import type { FeatureRow } from "@shared/types";

import { usePrefersDark } from "@/lib/hooks/useColorScheme";
import { darkTokens, lightTokens } from "@/styles/tokens";

import { Plot } from "./PlotlyBase";

interface HistoricalVolChartProps {
  rows: FeatureRow[];
}

export function HistoricalVolChart({ rows }: HistoricalVolChartProps) {
  const prefersDark = usePrefersDark();
  const tokens = prefersDark ? darkTokens : lightTokens;

  const dates = rows.map((row) => row.date);
  const vol21 = rows.map((row) => row.values.rolling_vol_21d ?? null);
  const vol63 = rows.map((row) => row.values.rolling_vol_63d ?? null);

  const data: Data[] = [
    {
      x: dates,
      y: vol21.map((v) => (v == null ? null : v * 100)),
      type: "scatter",
      mode: "lines",
      name: "21-day volatility",
      line: { width: 2, color: tokens.series[0] },
      connectgaps: false,
    },
    {
      x: dates,
      y: vol63.map((v) => (v == null ? null : v * 100)),
      type: "scatter",
      mode: "lines",
      name: "63-day volatility",
      line: { width: 2, color: tokens.series[2] },
      connectgaps: false,
    },
  ];

  return (
    <Plot
      data={data}
      layout={{
        margin: { l: 48, r: 16, t: 16, b: 40 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: tokens.textSecondary, size: 12 },
        xaxis: { gridcolor: tokens.gridline, zeroline: false },
        yaxis: {
          title: { text: "Annualized volatility (%)" },
          gridcolor: tokens.gridline,
          zeroline: false,
        },
        legend: { orientation: "h", y: -0.2, font: { size: 11 } },
        hovermode: "x unified",
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ height: 280 }}
    />
  );
}
