// Plain-language explanations for every metric surfaced in the UI. This is
// the frontend mirror of documentation/metrics_glossary.md — keep both in
// sync when adding a new metric.

export interface GlossaryEntry {
  title: string;
  description: string;
  example?: string;
}

export type MetricKey =
  | "valueAtRisk"
  | "expectedShortfall"
  | "probPositiveReturn"
  | "maxDrawdown"
  | "confidenceInterval"
  | "worstBest5pct"
  | "regimeConfidence"
  | "regime"
  | "compositeScore"
  | "directionalAccuracy"
  | "coverage90"
  | "crps"
  | "rollingVol21d"
  | "rollingVol63d"
  | "momentum10d"
  | "drawdownFeature"
  | "rollingSkew63d"
  | "rollingKurtosis63d"
  | "usedFallback"
  | "nObservations";

export const METRIC_GLOSSARY: Record<MetricKey, GlossaryEntry> = {
  valueAtRisk: {
    title: "Value at Risk (95%)",
    description: "There is a 5% chance losses exceed this value over the forecast horizon.",
    example: "A VaR of 12% means: in the worst 5% of simulated outcomes, you'd lose at least 12%.",
  },
  expectedShortfall: {
    title: "Expected Shortfall (95%)",
    description:
      "The average loss in just the worst 5% of simulated outcomes — how bad it gets when VaR is breached.",
    example: "If VaR is 12% but Expected Shortfall is 18%, the worst outcomes average an 18% loss.",
  },
  probPositiveReturn: {
    title: "Probability of Positive Return",
    description: "The fraction of simulated future paths that end higher than today's price.",
  },
  maxDrawdown: {
    title: "Maximum Drawdown",
    description: "The largest simulated peak-to-trough decline over the forecast horizon.",
  },
  confidenceInterval: {
    title: "90% Confidence Interval",
    description: "90% of simulated outcomes fall between these two values.",
  },
  worstBest5pct: {
    title: "Worst / Best 5%",
    description:
      "The average outcome among the worst 5% and best 5% of simulated paths — a look at the tails, not just the typical case.",
  },
  regimeConfidence: {
    title: "Regime Confidence",
    description:
      "How certain the model is about which market regime is currently in effect, based on recent price behavior.",
  },
  regime: {
    title: "Market Regime",
    description:
      "An unsupervised classification of the current market environment (e.g. low volatility, trending, stress/crisis), detected from recent price behavior with a Hidden Markov Model.",
  },
  compositeScore: {
    title: "Composite Score",
    description:
      "A combined ranking score built from historical forecast accuracy, error, directional accuracy, and calibration in backtests. Lower is better.",
  },
  directionalAccuracy: {
    title: "Directional Accuracy",
    description:
      "How often the model correctly predicted whether the price would go up or down, in past backtests.",
  },
  coverage90: {
    title: "90% Interval Coverage",
    description:
      "In past backtests, the fraction of outcomes that actually fell within the model's predicted 90% range. A well-calibrated model should be close to 90%.",
  },
  crps: {
    title: "CRPS (Continuous Ranked Probability Score)",
    description:
      "A statistical score measuring how well the model's entire predicted probability distribution matched the actual outcome, not just a single point forecast. Lower is better.",
  },
  rollingVol21d: {
    title: "21-Day Rolling Volatility",
    description:
      "Annualized volatility calculated from the last 21 trading days (about one month) of returns.",
  },
  rollingVol63d: {
    title: "63-Day Rolling Volatility",
    description:
      "Annualized volatility calculated from the last 63 trading days (about one quarter) of returns.",
  },
  momentum10d: {
    title: "10-Day Momentum",
    description:
      "How much the price has moved, up or down, over the last 10 trading days (about two weeks) — a simple gauge of whether the stock has been trending.",
    example:
      "Strong positive momentum means the price has been climbing steadily; strong negative momentum means it's been sliding.",
  },
  drawdownFeature: {
    title: "Current Drawdown",
    description:
      "How far today's price sits below its most recent peak. Zero means the stock is at a new high; a large negative number means it's well off its highs.",
  },
  rollingSkew63d: {
    title: "63-Day Skewness",
    description:
      "Whether recent daily price moves have leaned toward occasional sharp drops (negative skew) or occasional sharp jumps (positive skew), over the last quarter of trading.",
    example:
      "Stocks often show negative skew — routine small gains punctuated by rare, sharp sell-offs.",
  },
  rollingKurtosis63d: {
    title: "63-Day Kurtosis",
    description:
      "How often recent daily moves have included extreme, outlier-sized days compared to a normal, well-behaved market — the higher this is, the 'fatter-tailed' and less predictable recent behavior has been.",
  },
  usedFallback: {
    title: "Universal Prior",
    description:
      "This ticker doesn't have its own backtest history yet, so the recommendation is based on a general-purpose model performance table built across a basket of other stocks. Running a backtest for this ticker will personalize future recommendations.",
  },
  nObservations: {
    title: "Backtest Windows",
    description:
      "The number of historical out-of-sample test windows a model's performance statistics are based on. More windows generally means a more reliable estimate.",
  },
};
