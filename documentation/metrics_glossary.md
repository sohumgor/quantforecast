# Metrics Glossary

Plain-language explanations for every statistical/risk metric surfaced in the
UI. This file is the single authored source for both this documentation and
the frontend's info-tooltip copy (`frontend/src/components/tooltip/metricGlossary.ts`,
added alongside the dashboard in Phase 8) — write an entry here first, then
mirror it there.

## Feature engineering (implemented)

- **Return / log return** — the day's simple or continuously-compounded price change.
- **Rolling volatility** — annualized standard deviation of returns over a trailing window; how much the price has been swinging recently.
- **Realized volatility** — annualized volatility estimated from the sum of squared daily returns over a window.
- **GARCH volatility** — a fitted GARCH(1,1) model's estimate of volatility, which captures "volatility clustering" (calm periods stay calm, turbulent periods stay turbulent).
- **Momentum** — the total return over a trailing window; positive momentum means the price has been rising.
- **Trend strength** — the annualized slope of the log price over a trailing window; a signed measure of how strong and persistent a trend has been.
- **Drawdown** — the percentage decline from the highest price reached so far.
- **Autocorrelation** — how much today's return tends to repeat (or reverse) yesterday's.
- **Sharpe ratio** — return earned per unit of total risk taken (annualized).
- **Sortino ratio** — like Sharpe, but only penalizes downside volatility, not upside swings.
- **Skewness** — whether return outcomes are lopsided toward large gains (positive) or large losses (negative).
- **Kurtosis** — how much more likely extreme outcomes are than a normal distribution would predict ("fat tails").
- **Beta** — how sensitive the asset's returns are to a benchmark's returns.
- **Volume z-score** — how unusual today's trading volume is relative to its recent average.
- **Amihud illiquidity** — a proxy for how much a given amount of trading tends to move the price; higher means less liquid.

## Risk analytics & backtesting (planned, later phases)

Value at Risk, Expected Shortfall/CVaR, probability of positive return,
forecast confidence intervals, CRPS, interval coverage/calibration, and
directional accuracy will be documented here as they're implemented.
