import type { RiskAnalyticsInfo } from "@shared/types";

import { formatCurrency, formatPercent } from "./format";

export type RiskLevel = "Low" | "Moderate" | "High";

/** Same 10%/20% VaR thresholds `VaRGauge` colors by, centralized here so the
 * gauge and the plain-English risk level always agree. */
export function classifyRiskLevel(valueAtRisk95: number): RiskLevel {
  const pct = valueAtRisk95 * 100;
  if (pct < 10) return "Low";
  if (pct < 20) return "Moderate";
  return "High";
}

export const RISK_LEVEL_EXPLANATION: Record<RiskLevel, string> = {
  Low: "Based on thousands of simulations, this stock's likely losses over the forecast period are relatively small compared to typical stocks.",
  Moderate:
    "Based on thousands of simulations, this stock could see a meaningful decline over the forecast period — worth planning for, but not extreme.",
  High: "Based on thousands of simulations, this stock could see a large decline over the forecast period. Only invest what you can afford to see drop significantly.",
};

export interface RiskSummaryItem {
  label: string;
  interpretation: string;
}

export interface RiskSummary {
  level: RiskLevel;
  levelExplanation: string;
  items: RiskSummaryItem[];
}

/** Builds the beginner-facing Risk Summary card content entirely from
 * already-computed values in `RiskAnalyticsInfo` — no new statistics. */
export function buildRiskSummary(
  risk: RiskAnalyticsInfo,
  currentPrice: number,
  tickerSymbol: string,
  dailyVolPct: number | null,
): RiskSummary {
  const level = classifyRiskLevel(risk.value_at_risk_95);
  const worstCasePrice = currentPrice * (1 + risk.distribution.worst_5pct);

  const items: RiskSummaryItem[] = [
    {
      label: "Largest expected downside",
      interpretation: `If the worst 5% of simulated outcomes occur, ${tickerSymbol} would decline by about ${formatPercent(
        risk.expected_shortfall_95,
      )} on average over this period.`,
    },
  ];

  if (dailyVolPct !== null) {
    items.push({
      label: "Typical day-to-day fluctuation",
      interpretation: `On a typical trading day recently, ${tickerSymbol}'s price has moved up or down by roughly ${dailyVolPct.toFixed(
        1,
      )}%.`,
    });
  }

  items.push(
    {
      label: "Chance of a gain",
      interpretation: `Across the simulations, ${tickerSymbol} finished above today's price about ${formatPercent(
        risk.distribution.prob_positive_return,
      )} of the time.`,
    },
    {
      label: "Potential worst-case scenario",
      interpretation: `In a worst-case simulation (the bottom 5%), ${tickerSymbol} falls to around ${formatCurrency(
        worstCasePrice,
      )} (${formatPercent(risk.distribution.worst_5pct)}).`,
    },
  );

  return { level, levelExplanation: RISK_LEVEL_EXPLANATION[level], items };
}

/** Converts an annualized volatility figure (e.g. `rolling_vol_21d`, already
 * a fraction like 0.32 for 32%) into a rough "typical daily move" percentage. */
export function annualizedVolToDailyPct(annualizedVol: number): number {
  return (annualizedVol / Math.sqrt(252)) * 100;
}
