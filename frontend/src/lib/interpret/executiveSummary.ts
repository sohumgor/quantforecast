import type { AnalysisResponse } from "@shared/types";

import { REGIME_DISPLAY_LABEL } from "@/lib/regime";

import { formatPercent } from "./format";
import { classifyConfidence } from "./recommendation";

/** Programmatically synthesizes the full analysis into a short, deterministic
 * "executive summary" paragraph — no LLM involved, just a template populated
 * with the real computed values already in `AnalysisResponse`. Refers to the
 * company by name (not just its ticker) whenever one is available. */
export function buildExecutiveSummary(
  data: AnalysisResponse,
  horizonLabel: string,
  companyName?: string | null,
): string {
  const subject = companyName ?? data.ticker;
  const regimeLabel = REGIME_DISPLAY_LABEL[data.regime.label].toLowerCase();
  const topModel = data.ranked_models.find((m) => m.name === data.selected_model.model_name);
  const probUp = data.risk_analytics.distribution.prob_positive_return;
  const confidenceLevel = topModel ? classifyConfidence(topModel.confidence) : "Moderate";

  const direction =
    probUp >= 0.55 ? "an upward move" : probUp <= 0.45 ? "a downward move" : "either direction";

  const opportunityClause = `a possible gain of around ${formatPercent(
    data.risk_analytics.distribution.best_5pct,
  )} in an optimistic scenario`;
  const riskClause = `a potential decline of about ${formatPercent(
    data.risk_analytics.expected_shortfall_95,
  )} in a bad-case scenario`;

  return (
    `${subject} (${data.ticker}) is currently in a ${regimeLabel} environment. Over the next ${horizonLabel.toLowerCase()}, ` +
    `our simulations lean toward ${direction}, with about a ${formatPercent(probUp)} chance of finishing higher than today's price of $${data.current_price.toFixed(2)}. ` +
    `The main opportunity is ${opportunityClause}, while the biggest risk to watch is ${riskClause}. ` +
    `${confidenceLevel} confidence backs this forecast, using ${data.selected_model.display_name} — historically the most reliable model when ${subject} was in similar conditions.`
  );
}
