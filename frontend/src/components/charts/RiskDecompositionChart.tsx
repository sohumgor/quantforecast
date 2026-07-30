"use client";

import type { Data } from "plotly.js";
import type { DistributionInfo } from "@shared/types";

import { usePrefersDark } from "@/lib/hooks/useColorScheme";
import { hexToRgba } from "@/lib/color";
import { darkTokens, lightTokens } from "@/styles/tokens";

import { Plot } from "./PlotlyBase";

interface RiskDecompositionChartProps {
  distribution: DistributionInfo;
}

/** Decomposes the forecast return distribution into worst-5% / 90% CI /
 * median / best-5% bands on one axis. */
export function RiskDecompositionChart({ distribution }: RiskDecompositionChartProps) {
  const prefersDark = usePrefersDark();
  const tokens = prefersDark ? darkTokens : lightTokens;
  const color = tokens.series[0];
  const toPct = (v: number) => v * 100;

  const data: Data[] = [
    {
      type: "scatter",
      x: [toPct(distribution.worst_5pct), toPct(distribution.best_5pct)],
      y: ["Return", "Return"],
      mode: "lines",
      line: { width: 10, color: tokens.gridline },
      hoverinfo: "skip",
      showlegend: false,
    },
    {
      type: "scatter",
      x: [toPct(distribution.ci_lower_90), toPct(distribution.ci_upper_90)],
      y: ["Return", "Return"],
      mode: "lines",
      line: { width: 22, color: hexToRgba(color, 0.32) },
      name: "90% confidence interval",
      hovertemplate: "90%% CI<extra></extra>",
    },
    {
      type: "scatter",
      x: [toPct(distribution.median_return)],
      y: ["Return"],
      mode: "markers",
      marker: { size: 16, color, line: { width: 2, color: tokens.surface } },
      name: "Median",
      hovertemplate: `Median: ${toPct(distribution.median_return).toFixed(1)}%<extra></extra>`,
    },
  ];

  return (
    <Plot
      data={data}
      layout={{
        margin: { l: 16, r: 16, t: 8, b: 40 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: tokens.textSecondary, size: 12 },
        xaxis: {
          title: { text: "Return (%)" },
          gridcolor: tokens.gridline,
          zeroline: true,
          zerolinecolor: tokens.baseline,
        },
        yaxis: { visible: false },
        legend: { orientation: "h", y: -0.35, font: { size: 11 } },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ height: 150 }}
    />
  );
}
