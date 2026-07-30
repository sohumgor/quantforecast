"use client";

import type { Data } from "plotly.js";
import type { PerformanceRow } from "@shared/types";

import { usePrefersDark } from "@/lib/hooks/useColorScheme";
import { ALL_REGIME_LABELS, REGIME_DISPLAY_LABEL } from "@/lib/regime";
import { darkTokens, lightTokens } from "@/styles/tokens";

import { Plot } from "./PlotlyBase";

interface ModelComparisonHeatmapProps {
  rows: PerformanceRow[];
  modelDisplayNames: Record<string, string>;
}

/** Regime x model mean-CRPS grid — sequential (single hue), lower=better=lighter. */
export function ModelComparisonHeatmap({ rows, modelDisplayNames }: ModelComparisonHeatmapProps) {
  const prefersDark = usePrefersDark();
  const tokens = prefersDark ? darkTokens : lightTokens;

  const regimes = ALL_REGIME_LABELS.filter((label) => rows.some((r) => r.regime === label));
  const models = Array.from(new Set(rows.map((r) => r.model_name))).sort();

  const z = models.map((model) =>
    regimes.map((regime) => {
      const row = rows.find((r) => r.model_name === model && r.regime === regime);
      return row ? row.mean_crps : null;
    }),
  );

  const data: Data[] = [
    {
      type: "heatmap",
      z,
      x: regimes.map((r) => REGIME_DISPLAY_LABEL[r]),
      y: models.map((m) => modelDisplayNames[m] ?? m),
      colorscale: [
        [0, tokens.sequential[100]],
        [1, tokens.sequential[700]],
      ],
      hoverongaps: false,
      hovertemplate: "%{y} in %{x}<br>Mean CRPS: %{z:.3f}<extra></extra>",
      colorbar: {
        title: { text: "Mean CRPS", side: "right" },
        tickfont: { size: 10, color: tokens.textMuted },
        thickness: 14,
      },
    },
  ];

  return (
    <Plot
      data={data}
      layout={{
        margin: { l: 160, r: 16, t: 16, b: 60 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: tokens.textSecondary, size: 12 },
        xaxis: { tickangle: -20 },
        yaxis: { automargin: true },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ height: Math.max(220, models.length * 44 + 80) }}
    />
  );
}
