"use client";

import type { Data } from "plotly.js";
import type { DensityInfo } from "@shared/types";

import { usePrefersDark } from "@/lib/hooks/useColorScheme";
import { darkTokens, lightTokens } from "@/styles/tokens";

import { Plot } from "./PlotlyBase";

interface ProbabilityDensityChartProps {
  density: DensityInfo;
  currentPrice: number;
}

export function ProbabilityDensityChart({ density, currentPrice }: ProbabilityDensityChartProps) {
  const prefersDark = usePrefersDark();
  const tokens = prefersDark ? darkTokens : lightTokens;

  const centers = density.bin_edges
    .slice(0, -1)
    .map((edge, i) => (edge + density.bin_edges[i + 1]) / 2);
  const widths = density.bin_edges.slice(0, -1).map((edge, i) => density.bin_edges[i + 1] - edge);

  const data: Data[] = [
    {
      type: "bar",
      x: centers,
      y: density.counts,
      width: widths,
      marker: { color: tokens.series[0] },
      hovertemplate: "Price: $%{x:.2f}<br>Simulated paths: %{y}<extra></extra>",
    },
  ];

  return (
    <Plot
      data={data}
      layout={{
        margin: { l: 44, r: 16, t: 16, b: 40 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: tokens.textSecondary, size: 12 },
        bargap: 0.02,
        xaxis: {
          title: { text: "Simulated terminal price ($)" },
          gridcolor: tokens.gridline,
          zeroline: false,
        },
        yaxis: { title: { text: "Frequency" }, gridcolor: tokens.gridline, zeroline: false },
        shapes: [
          {
            type: "line",
            x0: currentPrice,
            x1: currentPrice,
            y0: 0,
            y1: 1,
            yref: "paper",
            line: { color: tokens.textMuted, width: 1.5, dash: "dot" },
          },
        ],
        annotations: [
          {
            x: currentPrice,
            y: 1,
            yref: "paper",
            text: "Current price",
            showarrow: false,
            yanchor: "bottom",
            font: { size: 10, color: tokens.textMuted },
          },
        ],
        showlegend: false,
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ height: 280 }}
    />
  );
}
