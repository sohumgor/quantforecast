import type { FeatureRow } from "@shared/types";

export interface VolatilityComparison {
  latestPct: number;
  averagePct: number;
  sentence: string;
}

export type VolatilityLevel = "Low" | "Medium" | "High";

export const VOLATILITY_LEVEL_ICON: Record<VolatilityLevel, string> = {
  Low: "🟢",
  Medium: "🟡",
  High: "🔴",
};

/** Bands based on typical annualized equity volatility, not just how a
 * ticker compares to its own history — a stock that's always turbulent
 * should still read "High" even during one of its calmer stretches. */
export function classifyVolatilityLevel(annualizedPct: number): VolatilityLevel {
  if (annualizedPct < 20) return "Low";
  if (annualizedPct < 35) return "Medium";
  return "High";
}

/** Compares the latest 21-day annualized volatility reading to its own
 * historical average for this ticker — a real, ticker-specific comparison
 * rather than a generic claim about "high" or "low" volatility. */
export function compareVolatilityToHistory(
  rows: FeatureRow[],
  tickerSymbol: string,
): VolatilityComparison | null {
  const values = rows
    .map((r) => r.values.rolling_vol_21d)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (values.length === 0) return null;

  const latest = values[values.length - 1];
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const latestPct = latest * 100;
  const averagePct = average * 100;

  const ratio = latest / average;
  const comparison =
    ratio >= 1.25
      ? "notably higher than its typical level"
      : ratio >= 1.05
        ? "somewhat higher than its typical level"
        : ratio <= 0.75
          ? "notably lower than its typical level"
          : ratio <= 0.95
            ? "somewhat lower than its typical level"
            : "close to its typical level";

  return {
    latestPct,
    averagePct,
    sentence: `${tickerSymbol}'s current volatility of ${latestPct.toFixed(0)}% is ${comparison} of about ${averagePct.toFixed(0)}% over the period shown.`,
  };
}
