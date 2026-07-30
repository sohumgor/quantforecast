"use client";

import type { Data } from "plotly.js";

import { usePrefersDark } from "@/lib/hooks/useColorScheme";
import { darkTokens, lightTokens } from "@/styles/tokens";

import { Plot } from "./PlotlyBase";

interface ExpectedShortfallChartProps {
  valueAtRisk95: number;
  expectedShortfall95: number;
}

export function ExpectedShortfallChart({
  valueAtRisk95,
  expectedShortfall95,
}: ExpectedShortfallChartProps) {
  const prefersDark = usePrefersDark();
  const tokens = prefersDark ? darkTokens : lightTokens;

  const varPct = valueAtRisk95 * 100;
  const esPct = expectedShortfall95 * 100;

  const data: Data[] = [
    {
      type: "bar",
      orientation: "h",
      y: ["Value at Risk", "Expected Shortfall"],
      x: [varPct, esPct],
      marker: { color: [tokens.series[0], tokens.status.critical] },
      text: [`${varPct.toFixed(1)}%`, `${esPct.toFixed(1)}%`],
      textposition: "outside",
      hovertemplate: "%{y}: %{x:.2f}%<extra></extra>",
    },
  ];

  return (
    <Plot
      data={data}
      layout={{
        margin: { l: 120, r: 48, t: 16, b: 36 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: tokens.textSecondary, size: 12 },
        xaxis: {
          title: { text: "Potential loss (%)" },
          gridcolor: tokens.gridline,
          zeroline: false,
        },
        yaxis: { automargin: true },
        showlegend: false,
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ height: 160 }}
    />
  );
}
