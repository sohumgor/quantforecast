# Regime Detection

Primary method: a Hidden Markov Model (`hmmlearn.GaussianHMM`, 5 states by
default, `full` covariance) fit on six standardized rolling features
(`log_return`, `rolling_vol_21d`, `momentum_10d`, `drawdown`,
`rolling_skew_63d`, `rolling_kurtosis_63d`).

Raw HMM states are mapped to semantic labels (Low/Medium/High Volatility,
High Volatility with Jumps, Trending, Sideways, Stress/Crisis) by a
deterministic rule (`regime_detection/regime_labeling.py`), not a learned
classifier:

1. States are ranked by mean volatility. The lowest-volatility state is
   always `LOW_VOL`.
2. The highest-volatility state becomes `STRESS_CRISIS` if its mean drawdown
   is severe (≤ -15% by default), else `HIGH_VOL_JUMPS` if its mean excess
   kurtosis is elevated (≥ 3.0), else plain `HIGH_VOL`.
3. Remaining "middle" states become `TRENDING` if mean absolute momentum is
   strong (≥ 2%), `SIDEWAYS` if it's near zero (< 1%), else `MEDIUM_VOL`.

All thresholds live in `LabelingThresholds` (mirrored in
`backend/config/defaults.yaml`) and are fully auditable — the only
unsupervised step is state *discovery*, not label assignment.

A `sklearn.mixture.GaussianMixture` serves as a secondary, non-time-dependent
comparison (`GMMRegimeDetector`); `regime_detection/comparator.py` computes
agreement rate and Cohen's kappa between the two, surfaced only in Advanced
Mode — it never affects model selection.

`RegimeTimelineBuilder` decodes a fitted detector across the full historical
feature series and persists the result to
`research/regime_timelines/{TICKER}.parquet`, the source of truth for both
the Regime Timeline chart and (in later phases) the backtesting engine's
regime-at-window lookups.

API: `GET /api/regime/{ticker}` (current regime + posterior) and
`GET /api/regime/{ticker}/history` (full timeline).
