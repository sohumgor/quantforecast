import type { FeatureRow } from "@shared/types";

import type { MetricKey } from "@/components/tooltip/metricGlossary";

// The same feature columns the HMM regime detector is fit on
// (backend/config/defaults.yaml -> regime_detection.feature_columns, minus
// log_return which isn't meaningfully "high/low" on its own).
export const REGIME_FEATURE_COLUMNS = [
  "rolling_vol_21d",
  "momentum_10d",
  "drawdown",
  "rolling_skew_63d",
  "rolling_kurtosis_63d",
] as const;

export const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  rolling_vol_21d: "Volatility (21d)",
  momentum_10d: "Momentum (10d)",
  drawdown: "Drawdown",
  rolling_skew_63d: "Skewness (63d)",
  rolling_kurtosis_63d: "Kurtosis (63d)",
};

export const FEATURE_GLOSSARY_KEYS: Record<string, MetricKey> = {
  rolling_vol_21d: "rollingVol21d",
  momentum_10d: "momentum10d",
  drawdown: "drawdownFeature",
  rolling_skew_63d: "rollingSkew63d",
  rolling_kurtosis_63d: "rollingKurtosis63d",
};

export interface PercentileDescriptor {
  label: string;
  tone: "low" | "typical" | "high";
}

/** Turns a raw 0-100 percentile into the plain-English framing that actually
 * makes it legible: nobody intuitively knows what "84th percentile" means,
 * but everyone knows what "much higher than usual" means. */
export function percentileDescriptor(percentile: number): PercentileDescriptor {
  if (percentile >= 90) return { label: "Much higher than usual", tone: "high" };
  if (percentile >= 70) return { label: "Higher than usual", tone: "high" };
  if (percentile > 30) return { label: "Typical", tone: "typical" };
  if (percentile > 10) return { label: "Lower than usual", tone: "low" };
  return { label: "Much lower than usual", tone: "low" };
}

export interface FeaturePercentile {
  key: string;
  label: string;
  percentile: number;
  currentValue: number | null;
}

export function percentileRank(values: number[], target: number): number {
  if (values.length === 0) return 50;
  const below = values.filter((v) => v <= target).length;
  return (below / values.length) * 100;
}

/** Where the latest value of each regime-driving feature sits relative to
 * its own historical distribution — a real, comparable (0-100) way to show
 * "what's driving the current regime classification" without fabricating a
 * feature-importance score the HMM doesn't itself produce. */
export function computeFeaturePercentiles(rows: FeatureRow[]): FeaturePercentile[] {
  if (rows.length === 0) return [];
  const latest = rows[rows.length - 1];
  return REGIME_FEATURE_COLUMNS.map((key) => {
    const series = rows
      .map((r) => r.values[key])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const currentValue = latest.values[key];
    const percentile =
      typeof currentValue === "number" ? percentileRank(series, currentValue) : 50;
    return {
      key,
      label: FEATURE_DISPLAY_NAMES[key] ?? key,
      percentile,
      currentValue: typeof currentValue === "number" ? currentValue : null,
    };
  });
}

/** Names the single most unusual regime-driving feature (furthest from the
 * 50th percentile of its own history) for a one-sentence interpretation. */
export function mostExtremeFeature(entries: FeaturePercentile[]): FeaturePercentile | null {
  if (entries.length === 0) return null;
  return entries.reduce((most, entry) =>
    Math.abs(entry.percentile - 50) > Math.abs(most.percentile - 50) ? entry : most,
  );
}
