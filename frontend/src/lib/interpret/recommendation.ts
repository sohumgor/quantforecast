import type { ModelScoreInfo, RegimeInfo } from "@shared/types";

import { REGIME_DISPLAY_LABEL } from "@/lib/regime";

import { formatPercent } from "./format";

/** Plain-English description of what each implemented model assumes about
 * how prices move — keyed by the backend's registry slug (see
 * `backend/forecasting_models/*.py`'s `name=` field). */
export const MODEL_ASSUMPTIONS: Record<string, string> = {
  gbm: "This model assumes the price grows at a steady average pace with random day-to-day noise of a consistent size — it doesn't expect the level of volatility itself to change over time.",
  garch11:
    "This model assumes that calm and turbulent periods tend to cluster together — big price swings are usually followed by more big swings, and quiet periods by more quiet periods.",
  egarch:
    "Like GARCH, this model assumes volatility clusters over time, but it also accounts for stocks typically becoming more volatile after price drops than after price gains.",
  merton_jump_diffusion:
    "This model assumes prices usually drift steadily, but occasionally experience sudden, sharp jumps — the kind of move often triggered by earnings surprises or major news.",
  historical_bootstrap:
    "This model assumes the future will statistically resemble this stock's own past — it re-uses real historical return patterns rather than a mathematical formula.",
  heston:
    "This model assumes volatility itself moves randomly over time and is correlated with price changes.",
  regime_switching:
    "This model assumes the stock can shift between distinct behavioral states over time, each with its own typical volatility and drift.",
};

/** Plain-English "when does this model actually do well" — distinct from
 * what it assumes mathematically. */
export const MODEL_PERFORMS_WELL: Record<string, string> = {
  gbm: "Tends to do well for calmer stocks whose day-to-day swings stay fairly steady over time.",
  garch11:
    "Tends to do well when volatility clearly clusters, without a strong difference between reactions to gains and losses.",
  egarch:
    "Tends to do well for stocks that get more volatile after price drops than after price gains — a common pattern in individual stocks.",
  merton_jump_diffusion:
    "Tends to do well for stocks prone to sudden, sharp moves, like around earnings announcements or major news.",
  historical_bootstrap:
    "Tends to do well when a stock's future is likely to resemble a wide variety of its own past behavior.",
  heston: "Tends to do well when a stock's volatility itself swings unpredictably over time.",
  regime_switching:
    "Tends to do well for stocks that alternate between clearly distinct behavioral states.",
};

export type ConfidenceLevel = "High" | "Moderate" | "Low";

export function classifyConfidence(confidence: number): ConfidenceLevel {
  if (confidence >= 0.65) return "High";
  if (confidence >= 0.35) return "Moderate";
  return "Low";
}

export const CONFIDENCE_EXPLANATION: Record<ConfidenceLevel, string> = {
  High: "This recommendation is backed by a strong track record in similar past conditions.",
  Moderate:
    "This recommendation is reasonably well-supported, though the historical evidence is more limited.",
  Low: "There isn't much historical evidence to lean on yet, so treat this recommendation with extra caution.",
};

export interface RecommendationNarrative {
  headline: string;
  whatItAssumes: string;
  whenItPerformsWell: string;
  whyChosen: string;
  confidenceLevel: ConfidenceLevel;
  confidenceNote: string;
}

export function buildRecommendationNarrative(
  topModel: ModelScoreInfo,
  regime: RegimeInfo,
  usedFallback: boolean,
  tickerSymbol: string,
): RecommendationNarrative {
  const confidenceLevel = classifyConfidence(topModel.confidence);
  const regimeLabelText = REGIME_DISPLAY_LABEL[regime.label].toLowerCase();
  const basisClause = usedFallback
    ? `across ${topModel.n_observations} similar ${regimeLabelText} periods observed in a broad basket of stocks (since ${tickerSymbol} doesn't have enough of its own backtest history yet)`
    : `across ${topModel.n_observations} similar ${regimeLabelText} periods in ${tickerSymbol}'s own history`;

  return {
    headline: `We chose ${topModel.display_name} because it has historically been the most reliable model under market conditions similar to today's.`,
    whatItAssumes:
      MODEL_ASSUMPTIONS[topModel.name] ??
      "This model makes specific mathematical assumptions about how prices move; see the technical details below.",
    whenItPerformsWell:
      MODEL_PERFORMS_WELL[topModel.name] ??
      "See the technical details below for how this model's performance was measured.",
    whyChosen: `Out of every model we tested, ${topModel.display_name} produced forecasts that were closer to what actually happened ${basisClause}.`,
    confidenceLevel,
    confidenceNote: `${CONFIDENCE_EXPLANATION[confidenceLevel]} (confidence score: ${formatPercent(topModel.confidence)})`,
  };
}
