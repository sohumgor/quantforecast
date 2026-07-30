from __future__ import annotations

import numpy as np

from analytics.metrics_contracts import DrawdownStats


def _validate_alpha(alpha: float) -> None:
    if not 0 < alpha < 1:
        raise ValueError(f"alpha must be in (0, 1), got {alpha}")


def value_at_risk(terminal_returns: np.ndarray, alpha: float = 0.05) -> float:
    """The loss (a positive number) not expected to be exceeded with probability
    `1 - alpha`, estimated empirically as the negative of the `alpha`-quantile
    of the terminal return distribution.

    Canonical implementation reused by `backtesting.metrics` for VaR-violation
    backtests — this is the one place VaR is computed.
    """
    _validate_alpha(alpha)
    return float(-np.quantile(terminal_returns, alpha))


def expected_shortfall(terminal_returns: np.ndarray, alpha: float = 0.05) -> float:
    """Average loss (a positive number) in the worst `alpha` fraction of
    outcomes (CVaR/ES) — always >= `value_at_risk` at the same `alpha`, since
    it accounts for the severity of the tail beyond the VaR cutoff, not just
    where the cutoff falls.
    """
    _validate_alpha(alpha)
    threshold = np.quantile(terminal_returns, alpha)
    tail = terminal_returns[terminal_returns <= threshold]
    if len(tail) == 0:
        tail = np.array([threshold])
    return float(-tail.mean())


def max_drawdown_distribution(paths: np.ndarray, start_price: float | None = None) -> DrawdownStats:
    """Distribution of maximum drawdown across simulated paths.

    If `start_price` is given, it's prepended as each path's day-0 reference
    so a sharp decline on the very first simulated day is correctly counted
    as a drawdown relative to the actual current price, not just relative to
    itself (which would always read as zero).
    """
    if start_price is not None:
        start_column = np.full((paths.shape[0], 1), start_price)
        full_paths = np.concatenate([start_column, paths], axis=1)
    else:
        full_paths = paths

    running_max = np.maximum.accumulate(full_paths, axis=1)
    drawdowns = full_paths / running_max - 1.0
    max_drawdown_per_path = drawdowns.min(axis=1)

    return DrawdownStats(
        mean_max_drawdown=float(max_drawdown_per_path.mean()),
        worst_case_drawdown=float(np.quantile(max_drawdown_per_path, 0.05)),
    )
