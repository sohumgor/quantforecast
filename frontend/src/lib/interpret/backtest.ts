import { formatPercent } from "./format";

export type ReliabilityLevel = "Excellent" | "Good" | "Fair" | "Limited";

/** A deterministic rubric combining how well-calibrated the model's
 * uncertainty bands were (coverage vs. the 90% target) with whether its
 * median forecast leaned the correct direction more often than a coin flip. */
export function classifyReliability(
  coverage90: number,
  directionalAccuracy: number,
): ReliabilityLevel {
  const coverageError = Math.abs(coverage90 - 0.9);
  if (coverageError <= 0.05 && directionalAccuracy >= 0.55) return "Excellent";
  if (coverageError <= 0.12 && directionalAccuracy >= 0.5) return "Good";
  if (coverageError <= 0.2) return "Fair";
  return "Limited";
}

export const RELIABILITY_EXPLANATION: Record<ReliabilityLevel, string> = {
  Excellent:
    "This model's confidence ranges were well-calibrated, and it correctly called the direction of the move more often than a coin flip.",
  Good: "This model's confidence ranges were reasonably well-calibrated and it called direction correctly somewhat more often than a coin flip.",
  Fair: "This model's confidence ranges were somewhat off from their target, so treat its ranges with a bit more caution.",
  Limited:
    "This model's confidence ranges didn't line up well with what actually happened historically — treat its forecasts cautiously.",
};

export interface BacktestReliabilitySummary {
  level: ReliabilityLevel;
  levelExplanation: string;
  paragraph: string;
}

export function buildBacktestReliabilitySummary(
  modelDisplayName: string,
  tickerSymbol: string,
  nWindows: number,
  meanAbsolutePctError: number,
  coverage90: number,
  directionalAccuracy: number,
): BacktestReliabilitySummary {
  const level = classifyReliability(coverage90, directionalAccuracy);

  const paragraph =
    `Across ${nWindows} rolling forecast windows for ${tickerSymbol}, ${modelDisplayName}'s typical price ` +
    `forecast was off by about ${formatPercent(meanAbsolutePctError, 1)} on average. The actual price landed ` +
    `inside the model's stated 90% confidence range ${formatPercent(coverage90)} of the time (the goal is 90%). ` +
    `It correctly predicted the direction of the move ${formatPercent(directionalAccuracy)} of the time ` +
    `(50% would be a coin flip).`;

  return { level, levelExplanation: RELIABILITY_EXPLANATION[level], paragraph };
}
