from __future__ import annotations

from datetime import UTC, datetime

import numpy as np
import pandas as pd

from analytics.risk_metrics import value_at_risk
from simulation.path_result import SimulationPaths

# Columns produced per-window by `evaluate_window`, before the engine attaches
# `model_name`/`window_origin`/`regime`.
WINDOW_METRIC_COLUMNS: tuple[str, ...] = (
    "mae",
    "squared_error",
    "crps",
    "within_90",
    "within_95",
    "directional_hit",
    "var_95_violated",
    "es_95",
)


def evaluate_window(
    paths: SimulationPaths, actual_future_prices: np.ndarray, start_price: float
) -> dict[str, float]:
    """Computes one row of raw per-window statistics: point-forecast error
    (median of the simulated terminal distribution vs. the actual price at
    horizon end), 90%/95% interval-coverage indicators, a directional-accuracy
    indicator, a VaR-violation indicator, CRPS, and the simulated ES estimate.

    These are aggregated across many windows (via `aggregate_window_results`)
    into the mean/median statistics actually reported (MAE, RMSE, coverage
    rates, etc.) — a single window has one point forecast and one outcome, so
    metrics like "median absolute error" only become meaningful in aggregate.

    VaR/CRPS reuse `analytics.risk_metrics`'s canonical VaR implementation;
    this module owns what's genuinely backtest-specific (point-forecast
    error, coverage/calibration, directional accuracy, window aggregation).
    """
    actual_terminal = float(actual_future_prices[-1])
    actual_return = actual_terminal / start_price - 1.0

    forecast_median = float(np.median(paths.terminal_values))
    forecast_median_return = forecast_median / start_price - 1.0

    p5, p95 = np.percentile(paths.terminal_values, [5, 95])
    p2_5, p97_5 = np.percentile(paths.terminal_values, [2.5, 97.5])

    terminal_returns = paths.terminal_values / start_price - 1.0
    var_95 = value_at_risk(terminal_returns, alpha=0.05)
    es_95 = _expected_shortfall_from_var(terminal_returns, var_95)

    return {
        "mae": abs(forecast_median - actual_terminal),
        "squared_error": (forecast_median - actual_terminal) ** 2,
        "crps": _crps_from_sample(paths.terminal_values, actual_terminal),
        "within_90": float(p5 <= actual_terminal <= p95),
        "within_95": float(p2_5 <= actual_terminal <= p97_5),
        "directional_hit": float(np.sign(forecast_median_return) == np.sign(actual_return)),
        "var_95_violated": float(-actual_return > var_95),
        "es_95": es_95,
        # Price-level context (not scored/aggregated) so the frontend can plot an
        # actual-vs-predicted timeline: every value below was already computed
        # above, just also surfaced here rather than discarded.
        "start_price": float(start_price),
        "actual_price": actual_terminal,
        "forecast_median_price": forecast_median,
        "forecast_p5_price": float(p5),
        "forecast_p95_price": float(p95),
    }


def aggregate_window_results(window_rows: pd.DataFrame) -> dict[str, float]:
    """Reduces many `evaluate_window` rows (for one model, optionally one
    regime) into the mean/median statistics that get stored/ranked on."""
    return {
        "n_observations": float(len(window_rows)),
        "mean_mae": float(window_rows["mae"].mean()),
        "mean_rmse": float(np.sqrt(window_rows["squared_error"].mean())),
        "median_ae": float(window_rows["mae"].median()),
        "mean_crps": float(window_rows["crps"].mean()),
        "coverage_90": float(window_rows["within_90"].mean()),
        "coverage_95": float(window_rows["within_95"].mean()),
        "directional_accuracy": float(window_rows["directional_hit"].mean()),
        "mean_var_violations": float(window_rows["var_95_violated"].mean()),
        "mean_es_95": float(window_rows["es_95"].mean()),
    }


def aggregate_by_regime_and_model(results_df: pd.DataFrame, source: str) -> pd.DataFrame:
    """Groups raw per-window rows by (regime, model_name) and reduces each
    group with `aggregate_window_results`, producing rows matching
    `model_selection.lookup_table.LOOKUP_TABLE_COLUMNS` (minus
    `composite_score`, which is computed at recommend-time, not stored).
    """
    if results_df.empty:
        return results_df

    now = datetime.now(UTC).isoformat()
    rows = []
    # groupby drops rows with a missing (None) regime by default, so windows
    # from before the regime detector had enough history are excluded here.
    for (regime, model_name), group in results_df.groupby(["regime", "model_name"]):
        agg = aggregate_window_results(group)
        row = {"regime": regime, "model_name": model_name, **agg}
        row["last_updated"] = now
        row["source"] = source
        rows.append(row)

    return pd.DataFrame(rows)


def _crps_from_sample(sample: np.ndarray, actual: float) -> float:
    """Continuous Ranked Probability Score from a Monte Carlo sample, via the
    O(n log n) sorted-sample estimator:
    `CRPS = E|X - y| - 0.5*E|X - X'|`, X,X' iid draws from the forecast
    sample, y the actual outcome. Verified against both brute-force pairwise
    computation and the closed-form Gaussian CRPS formula.
    """
    n = len(sample)
    term1 = np.mean(np.abs(sample - actual))
    sorted_sample = np.sort(sample)
    ranks = np.arange(1, n + 1)
    term2 = (2.0 / n**2) * np.sum((2 * ranks - n - 1) * sorted_sample)
    return float(term1 - 0.5 * term2)


def _expected_shortfall_from_var(terminal_returns: np.ndarray, var_estimate: float) -> float:
    """Simulated ES for one window: mean loss among simulated outcomes at
    least as bad as the simulated VaR threshold."""
    losses = -terminal_returns
    tail = losses[losses >= var_estimate]
    if len(tail) == 0:
        tail = np.array([var_estimate])
    return float(tail.mean())
