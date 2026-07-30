"use client";

import type { Data } from "plotly.js";
import type { RegimeTimelinePoint } from "@shared/types";

import { usePrefersDark } from "@/lib/hooks/useColorScheme";
import { buildDiscreteColorscale } from "@/lib/color";
import { ALL_REGIME_LABELS, REGIME_COLOR_INDEX, REGIME_DISPLAY_LABEL } from "@/lib/regime";
import { darkTokens, lightTokens } from "@/styles/tokens";

import { Plot } from "./PlotlyBase";

interface RegimeTimelineChartProps {
  points: RegimeTimelinePoint[];
}

export function RegimeTimelineChart({ points }: RegimeTimelineChartProps) {
  const prefersDark = usePrefersDark();
  const tokens = prefersDark ? darkTokens : lightTokens;

  const dates = points.map((p) => p.date);
  const z = points.map((p) => REGIME_COLOR_INDEX[p.label]);
  const text = points.map(
    (p) => `${REGIME_DISPLAY_LABEL[p.label]} (${(p.confidence * 100).toFixed(0)}% confidence)`,
  );
  const nSlots = tokens.series.length;

  const data: Data[] = [
    {
      type: "heatmap",
      z: [z],
      x: dates,
      y: ["Regime"],
      // @types/plotly.js types `text` as flat string[] even though Plotly
      // itself accepts a nested array matching a 2D `z` — known types gap.
      text: [text] as unknown as string[],
      hovertemplate: "%{x}<br>%{text}<extra></extra>",
      colorscale: buildDiscreteColorscale(tokens.series),
      zmin: 0,
      zmax: nSlots,
      showscale: false,
    },
  ];

  const presentLabels = ALL_REGIME_LABELS.filter((label) =>
    points.some((p) => p.label === label),
  );

  return (
    <div>
      <Plot
        data={data}
        layout={{
          margin: { l: 16, r: 16, t: 8, b: 32 },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: tokens.textSecondary, size: 12 },
          xaxis: { gridcolor: tokens.gridline },
          yaxis: { visible: false },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ height: 90 }}
      />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        {presentLabels.map((label) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: tokens.series[REGIME_COLOR_INDEX[label]] }}
            />
            {REGIME_DISPLAY_LABEL[label]}
          </span>
        ))}
      </div>
    </div>
  );
}
