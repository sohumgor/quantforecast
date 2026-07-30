# Architecture

QuantForecastPlatform is a locally-run, no-database quantitative forecasting and
risk-analysis tool. It is not a chatbot or an LLM stock picker — every forecast
is produced by statistical/stochastic models and probabilistic Monte Carlo
simulation, with an unsupervised regime detector and a deterministic model
selection engine driving which model runs.

## Guiding principles

- **Strict one-directional module layering, no import cycles**:
  `data_ingestion → feature_engineering → regime_detection → {forecasting_models, simulation} → analytics → visualization → api`.
  `backtesting` consumes the same lower layers and writes results to flat files
  that `model_selection` reads — a file-mediated feedback edge, never a live
  import cycle.
- **Regime detection and model selection are separate, composable stages.**
  The HMM/GMM never picks a forecasting model directly — it only classifies
  the market regime; a deterministic lookup/scoring engine does the picking.
- **No database.** All persistence (price cache, regime timelines, backtest
  results, performance lookup tables) is Parquet/CSV/JSON under `research/`.
- **Extensible via plugin registry.** Every forecasting model self-registers
  against a shared `ForecastModel` Protocol; adding a model never touches the
  selection engine.

## Backend module map

| Module | Responsibility |
|---|---|
| `data_ingestion` | Fetches/caches OHLCV history from yfinance. Only place `yfinance` is imported. |
| `feature_engineering` | Turns price history into a typed `FeatureSet` of statistical features (returns, volatility, momentum, drawdown, autocorrelation, risk ratios, distribution stats, liquidity). |
| `regime_detection` | HMM (primary) and GMM (secondary) unsupervised market-regime classification, plus a deterministic state→label mapping and the persisted regime timeline. |
| `forecasting_models` | The plugin family of stochastic simulators (GBM, GARCH(1,1), EGARCH, Merton Jump Diffusion, Historical Bootstrap, Heston, Regime Switching) behind one `ForecastModel` Protocol. |
| `model_selection` | Deterministic recommendation engine: regime + historical backtest performance → ranked models + human-readable explanation. |
| `simulation` | Generic Monte Carlo execution harness. |
| `analytics` | Risk analytics from simulated paths: VaR, CVaR/ES, drawdown distribution, distribution summary. |
| `backtesting` | Out-of-sample evaluation across all models; persists results and feeds `model_selection`'s lookup table. |
| `visualization` | Serializes analytics/paths into JSON-safe Plotly-ready payloads (no server-side chart rendering). |
| `api` | Thin FastAPI controllers; no business logic of its own. |

See the plan history for the full phase-by-phase build order and the detailed
per-module contracts (types, function signatures, on-disk schemas).

## Data flow (ticker → rendered dashboard)

```
ticker → ParquetPriceCache.get_or_fetch → PriceSeries
       → FeatureEngineeringPipeline.transform → FeatureSet
       → HMMRegimeDetector.predict → RegimeResult
       → ModelSelectionEngine.recommend → RecommendationResult
       → ForecastModel.calibrate + MonteCarloRunner.run → SimulationPaths
       → RiskAnalyticsBuilder.build → RiskAnalytics
       → visualization.serializers.* → chart payloads
       → AnalysisResponse → frontend dashboard
```
