from __future__ import annotations

import pandas as pd


def rolling_drawdown(prices: pd.Series) -> pd.Series:
    """Percentage decline from the running historical peak (<=0)."""
    running_max = prices.cummax()
    return prices / running_max - 1.0


def max_drawdown(prices: pd.Series) -> float:
    """Worst peak-to-trough decline over the full sample."""
    return float(rolling_drawdown(prices).min())
