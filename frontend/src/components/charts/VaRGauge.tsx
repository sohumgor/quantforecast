"use client";

import type { Data } from "plotly.js";

import { usePrefersDark } from "@/lib/hooks/useColorScheme";
import { hexToRgba } from "@/lib/color";
import { classifyRiskLevel } from "@/lib/interpret/risk";
import { darkTokens, lightTokens } from "@/styles/tokens";

import { Plot } from "./PlotlyBase";

interface VaRGaugeProps {
  valueAtRisk95: number; // fraction, e.g. 0.12 = 12%
}

export function VaRGauge({ valueAtRisk95 }: VaRGaugeProps) {
  const prefersDark = usePrefersDark();
  const tokens = prefersDark ? darkTokens : lightTokens;
  const pct = valueAtRisk95 * 100;
  const axisMax = Math.max(30, pct * 1.5);

  const riskLevel = classifyRiskLevel(valueAtRisk95);
  const barColor =
    riskLevel === "Low"
      ? tokens.status.good
      : riskLevel === "Moderate"
        ? tokens.status.warning
        : tokens.status.critical;

  const data: Data[] = [
    {
      type: "indicator",
      mode: "gauge+number",
      value: pct,
      number: { suffix: "%", font: { size: 30, color: tokens.foreground } },
      gauge: {
        axis: { range: [0, axisMax], tickcolor: tokens.textMuted, tickfont: { size: 10 } },
        bar: { color: barColor, thickness: 0.8 },
        bgcolor: "transparent",
        borderwidth: 0,
        steps: [
          { range: [0, 10], color: hexToRgba(tokens.status.good, 0.12) },
          { range: [10, 20], color: hexToRgba(tokens.status.warning, 0.12) },
          { range: [20, axisMax], color: hexToRgba(tokens.status.critical, 0.12) },
        ],
      },
    },
  ];

  return (
    <Plot
      data={data}
      layout={{
        margin: { l: 24, r: 24, t: 24, b: 8 },
        paper_bgcolor: "transparent",
        font: { color: tokens.textSecondary },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ height: 200 }}
    />
  );
}
