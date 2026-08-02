"use client";

import { useState } from "react";
import type { Data, PlotMouseEvent } from "plotly.js";
import type { FanChartInfo } from "@shared/types";

import { usePrefersDark } from "@/lib/hooks/useColorScheme";
import { hexToRgba } from "@/lib/color";
import { tradingDayToDate } from "@/lib/interpret/format";
import { darkTokens, lightTokens } from "@/styles/tokens";
import { Switch } from "@/components/ui/Switch";

import { Plot } from "./PlotlyBase";

interface MonteCarloFanChartProps {
  fanChart: FanChartInfo;
  currentPrice: number;
  startDate?: Date;
}

/** Full percentile-band fan chart (P5/P25/P50/P75/P95), with every sampled
 * path drawn faintly behind it. A locked "path explorer" mode keeps those
 * background paths inert until a student opts in, at which point they become
 * hoverable/clickable so a single simulated future can be picked out and
 * traced. */
export function MonteCarloFanChart({ fanChart, currentPrice, startDate }: MonteCarloFanChartProps) {
  const prefersDark = usePrefersDark();
  const tokens = prefersDark ? darkTokens : lightTokens;
  const color = tokens.series[0];
  const origin = startDate ?? new Date();

  const [exploreMode, setExploreMode] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<number | null>(null);
  const [selectedPath, setSelectedPath] = useState<number | null>(null);

  // Reset the picked/hovered path when the underlying data changes (new
  // ticker or horizon) — done during render, per React's guidance for
  // adjusting state from a prop change, rather than in an effect.
  const [prevFanChart, setPrevFanChart] = useState(fanChart);
  if (prevFanChart !== fanChart) {
    setPrevFanChart(fanChart);
    setSelectedPath(null);
    setHoveredPath(null);
  }

  const x = [0, ...fanChart.horizon_days].map(
    (d) => tradingDayToDate(origin, d).toISOString().slice(0, 10),
  );
  const withOrigin = (values: number[]) => [currentPrice, ...values];
  const p5 = withOrigin(fanChart.percentiles.p5 ?? []);
  const p25 = withOrigin(fanChart.percentiles.p25 ?? []);
  const p50 = withOrigin(fanChart.percentiles.p50 ?? []);
  const p75 = withOrigin(fanChart.percentiles.p75 ?? []);
  const p95 = withOrigin(fanChart.percentiles.p95 ?? []);
  const samples = fanChart.sample_paths ?? [];

  const finalDay = x[x.length - 1];
  const finalMedian = p50[p50.length - 1];
  const finalLow = p5[p5.length - 1];
  const finalHigh = p95[p95.length - 1];

  const pathTraces: Data[] = samples.map((path, i) => {
    const isSelected = selectedPath === i;
    const isHovered = hoveredPath === i;
    const pathColor = tokens.series[i % tokens.series.length];
    const opacity = isSelected ? 1 : isHovered ? 0.9 : 0.4;
    const width = isSelected ? 3 : isHovered ? 2 : 1.25;

    return {
      x,
      y: withOrigin(path),
      type: "scatter",
      mode: "lines",
      line: { width, color: hexToRgba(pathColor, opacity) },
      showlegend: false,
      hoverinfo: exploreMode ? "x+y" : "skip",
      hovertemplate: exploreMode
        ? `Simulation ${i + 1}<br>%{x|%b %d, %Y}: $%{y:.2f}<extra></extra>`
        : undefined,
      name: `Simulation ${i + 1}`,
    };
  });

  const data: Data[] = [
    ...pathTraces,
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
      line: { width: 2.5, color },
      name: "Median forecast",
      hovertemplate: "%{x|%b %d, %Y}<br>Median: $%{y:.2f}<extra></extra>",
    },
  ];

  const handlePoint = (event: Readonly<PlotMouseEvent>): number | null => {
    const point = event.points[0];
    if (!point || point.curveNumber >= samples.length) return null;
    return point.curveNumber;
  };

  const selectedFinalPrice =
    selectedPath !== null ? withOrigin(samples[selectedPath])[samples[selectedPath].length] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          {exploreMode
            ? "Hover or click any background line to trace one simulated future."
            : "Faint lines in the background are individual simulated paths."}
        </p>
        <Switch
          checked={exploreMode}
          onChange={(checked) => {
            setExploreMode(checked);
            setSelectedPath(null);
            setHoveredPath(null);
          }}
          label="Explore paths"
        />
      </div>

      <Plot
        data={data}
        layout={{
          margin: { l: 52, r: 92, t: 16, b: 40 },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: tokens.textSecondary, size: 12 },
          xaxis: { type: "date", tickformat: "%b %d", gridcolor: tokens.gridline, zeroline: false },
          yaxis: { title: { text: "Price ($)" }, gridcolor: tokens.gridline, zeroline: false },
          legend: { orientation: "h", y: -0.18, font: { size: 11 } },
          hovermode: exploreMode ? "closest" : "x unified",
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
              text: `Median  $${finalMedian.toFixed(0)}`,
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
        style={{ height: 400 }}
        onClick={
          exploreMode
            ? (event) => setSelectedPath((prev) => {
                const idx = handlePoint(event);
                return idx === prev ? null : idx;
              })
            : undefined
        }
        onHover={exploreMode ? (event) => setHoveredPath(handlePoint(event)) : undefined}
        onUnhover={exploreMode ? () => setHoveredPath(null) : undefined}
      />

      {exploreMode && selectedPath !== null && selectedFinalPrice !== null ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Simulation #{selectedPath + 1} — one possible future, ending near{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            ${selectedFinalPrice.toFixed(2)}
          </span>
          . Click it again to deselect.
        </p>
      ) : null}
    </div>
  );
}
