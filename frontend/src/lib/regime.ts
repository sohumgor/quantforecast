import type { RegimeLabelValue } from "@shared/types";

// Fixed regime -> categorical series-slot assignment, used everywhere a
// regime is colored (never re-cycled per chart).
export const REGIME_COLOR_INDEX: Record<RegimeLabelValue, number> = {
  low_vol: 0, // blue
  high_vol: 1, // orange
  sideways: 2, // aqua
  medium_vol: 3, // yellow
  high_vol_jumps: 6, // violet
  trending: 5, // green
  stress_crisis: 7, // red
};

export const REGIME_DISPLAY_LABEL: Record<RegimeLabelValue, string> = {
  low_vol: "Low Volatility",
  medium_vol: "Medium Volatility",
  high_vol: "High Volatility",
  high_vol_jumps: "High Volatility (Jumps)",
  trending: "Trending",
  sideways: "Sideways",
  stress_crisis: "Stress / Crisis",
};

export const ALL_REGIME_LABELS: RegimeLabelValue[] = [
  "low_vol",
  "medium_vol",
  "high_vol",
  "high_vol_jumps",
  "trending",
  "sideways",
  "stress_crisis",
];
