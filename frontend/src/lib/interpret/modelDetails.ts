// Plain-English, fundamentals-first explanations for the model catalog's
// detail modal. Deliberately not the same content as the terse one-line
// `description` the backend returns, and not the math-notation methodology
// docs in `documentation/model_methodology/` (written for contributors) —
// this is meant to actually teach a non-technical user what each model is
// doing and why they'd want it, in Simple mode as much as Advanced mode.

export interface ModelDetail {
  howItWorks: string;
  bestFor: string;
  watchOutFor: string;
}

export const MODEL_DETAILS: Record<string, ModelDetail> = {
  gbm: {
    howItWorks:
      "Assumes the price moves like a random walk with a constant average growth rate and a constant amount of day-to-day randomness. Every simulated day, the price ticks up or down by a random amount drawn from the same bell-curve distribution — there's no memory of recent trends or volatility spikes.",
    bestFor:
      "The steady baseline case: calm, ordinary markets where the recent past is a fair guide to the near future.",
    watchOutFor:
      "Can't represent volatility clustering (calm periods staying calm, turbulent periods staying turbulent) or sudden shocks, so it tends to understate risk around earnings, news events, or crises.",
  },
  garch11: {
    howItWorks:
      "Lets volatility itself change over time based on recent price swings: after a big move in either direction, the model expects the next few days to also be more volatile than usual, with that heightened volatility gradually fading back toward normal. This 'volatility clustering' is a well-documented real market pattern.",
    bestFor:
      "A stock going through a genuinely turbulent or calming-down stretch, where recent volatility is a better guide to tomorrow's volatility than a long-run average.",
    watchOutFor:
      "Treats a sharp drop and a sharp rally as equally likely to raise future volatility — it doesn't know that, historically, drops tend to rattle markets more than rallies do.",
  },
  egarch: {
    howItWorks:
      "Works like GARCH, but with one added feature: it knows that bad news typically rattles markets more than good news does. A sharp price drop pushes its volatility forecast up more than an equally-sized rally would — an asymmetry researchers call the 'leverage effect.'",
    bestFor:
      "Stocks with a history of this lopsided reaction to bad vs. good news — common across broad equities, especially larger, more established companies.",
    watchOutFor:
      "Needs a reasonable amount of price history to reliably estimate how lopsided the reaction has been; on very young or thinly-traded tickers, that asymmetry estimate can be noisy.",
  },
  historical_bootstrap: {
    howItWorks:
      "Doesn't assume any mathematical formula for how returns behave. Instead, it replays randomly-selected days (or short stretches of days) from the stock's own real trading history, stitched together into possible future paths. Whatever fat-tailed or lopsided behavior actually happened before is exactly what gets reused.",
    bestFor:
      "Stocks with unusual, hard-to-model return patterns, where trusting 'what actually happened before' beats a mathematical assumption about what should happen.",
    watchOutFor:
      "Can only produce outcomes similar in size to what's already in the historical sample — it can't imagine a shock bigger than anything the stock has experienced before.",
  },
  merton_jump_diffusion: {
    howItWorks:
      "Starts from the same steady random-walk assumption as Geometric Brownian Motion, then adds occasional sudden 'jumps' — sharp, one-day moves meant to capture things like surprise earnings, M&A news, or other shocks a smooth random walk can't produce on its own.",
    bestFor:
      "Stocks prone to sudden, sharp moves around specific events — earnings-sensitive names, biotech or legal-catalyst stocks, or anything with a history of large single-day gaps.",
    watchOutFor:
      "Estimating how often jumps happen and how large they typically are is inherently noisy with limited history — a stock that hasn't jumped recently may still carry a jump-risk allowance based on older history.",
  },
  heston: {
    howItWorks:
      "Rather than treating volatility as constant or based on recent history, this model treats volatility itself as its own random, ever-changing process — one that drifts back toward a long-run average over time, and tends to rise when prices fall, a coupling seen in real markets.",
    bestFor: "Options-pricing-grade volatility modeling — more sophisticated than most single-stock forecasts need.",
    watchOutFor: "Not yet implemented on this platform — shown here for completeness of the model catalog.",
  },
  regime_switching: {
    howItWorks:
      "Instead of one fixed set of parameters for all conditions, this model would let a stock 'switch' between a handful of distinct behavior modes (for example, calm-and-trending vs. volatile-and-crisis), each with its own drift and volatility, based on a fitted probability of moving between them.",
    bestFor: "Capturing the fact that a stock's own behavior isn't static — it drifts between distinct market moods over time.",
    watchOutFor: "Not yet implemented on this platform — shown here for completeness of the model catalog.",
  },
};
