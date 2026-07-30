from __future__ import annotations

import numpy as np
import pandas as pd


def momentum(prices: pd.Series, window: int = 10) -> pd.Series:
    """Total return over the trailing `window` periods."""
    return prices.pct_change(periods=window)


def trend_strength(prices: pd.Series, window: int = 50, periods_per_year: int = 252) -> pd.Series:
    """Rolling OLS slope of log price vs. time, annualized (a signed trend/drift strength)."""
    log_prices = np.log(prices)

    def _slope(values: np.ndarray) -> float:
        x = np.arange(len(values))
        return float(np.polyfit(x, values, 1)[0])

    return log_prices.rolling(window).apply(_slope, raw=True) * periods_per_year
