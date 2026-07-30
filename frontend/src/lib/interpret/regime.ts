import type { RegimeLabelValue, RegimeTimelinePoint } from "@shared/types";

import { formatPercent } from "./format";

interface RegimeEducation {
  /** Plain-language definition of the condition itself. */
  whatItMeans: string;
  /** What an investor concretely experiences day-to-day in this condition. */
  investorExperience: string;
}

export const REGIME_EDUCATION: Record<RegimeLabelValue, RegimeEducation> = {
  low_vol: {
    whatItMeans:
      "This stock's price has been moving in relatively small, calm steps compared to its own history.",
    investorExperience:
      "Investors typically see smaller day-to-day price swings and fewer surprises in this environment.",
  },
  medium_vol: {
    whatItMeans:
      "This stock's price is fluctuating by a fairly typical amount compared to its own history — not unusually calm, not unusually wild.",
    investorExperience:
      "Investors typically experience ordinary day-to-day ups and downs, without extreme moves in either direction.",
  },
  high_vol: {
    whatItMeans:
      "This stock's price has been swinging significantly more than usual compared to its own history.",
    investorExperience:
      "Investors typically see larger daily price moves and wider swings in both directions during periods like this.",
  },
  high_vol_jumps: {
    whatItMeans:
      "This stock has been experiencing large, sudden price jumps in addition to generally elevated volatility.",
    investorExperience:
      "Investors typically see occasional sharp, abrupt moves — often tied to news or earnings — layered on top of already choppy trading.",
  },
  trending: {
    whatItMeans: "This stock has shown a sustained directional move recently, up or down.",
    investorExperience:
      "Investors typically see the price continuing to move in one general direction over multiple weeks, rather than bouncing around a fixed level.",
  },
  sideways: {
    whatItMeans:
      "This stock's price has been range-bound recently, without a clear upward or downward direction.",
    investorExperience:
      "Investors typically see the price oscillate within a band, with gains giving back to losses and vice versa.",
  },
  stress_crisis: {
    whatItMeans:
      "This stock has recently shown severe declines combined with elevated volatility, consistent with broad market stress.",
    investorExperience:
      "Investors typically experience sharp drops, high day-to-day uncertainty, and larger-than-usual losses during periods like this.",
  },
};

export type UnusualnessLevel = "very common" | "fairly common" | "occasional" | "unusual";

export function classifyFrequency(fraction: number): UnusualnessLevel {
  if (fraction >= 0.4) return "very common";
  if (fraction >= 0.15) return "fairly common";
  if (fraction >= 0.05) return "occasional";
  return "unusual";
}

export interface RegimeFrequencyInfo {
  fraction: number;
  level: UnusualnessLevel;
  sentence: string;
}

/** Computes how often the ticker has historically been in its current regime,
 * from the already-fetched regime timeline — a real, ticker-specific stat
 * rather than a generic claim. */
export function computeRegimeFrequency(
  points: RegimeTimelinePoint[],
  currentLabel: RegimeLabelValue,
  tickerSymbol: string,
): RegimeFrequencyInfo | null {
  if (points.length === 0) return null;
  const matching = points.filter((p) => p.label === currentLabel).length;
  const fraction = matching / points.length;
  const level = classifyFrequency(fraction);
  const years = (points.length / 252).toFixed(1);

  const descriptor =
    level === "very common"
      ? "a common condition for this stock"
      : level === "fairly common"
        ? "a fairly typical condition for this stock"
        : level === "occasional"
          ? "a condition that comes up from time to time"
          : "a relatively unusual condition for this stock";

  return {
    fraction,
    level,
    sentence: `${tickerSymbol} has been in this kind of environment about ${formatPercent(
      fraction,
    )} of trading days over the last ${years} years — ${descriptor}.`,
  };
}

export function modelInfluenceSentence(
  regimeLabel: string,
  modelDisplayName: string,
  tickerSymbol: string,
): string {
  return `Because current conditions closely resemble other ${regimeLabel.toLowerCase()} periods, we selected ${modelDisplayName} — the model that has historically performed best for ${tickerSymbol} (or similar stocks) under this kind of environment.`;
}
