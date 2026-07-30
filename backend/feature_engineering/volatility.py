from __future__ import annotations

import numpy as np
import pandas as pd
from arch import arch_model


def rolling_volatility(
    returns: pd.Series, window: int = 21, periods_per_year: int = 252
) -> pd.Series:
    """Annualized rolling standard deviation of returns."""
    return returns.rolling(window).std() * np.sqrt(periods_per_year)


def historical_volatility(returns: pd.Series, periods_per_year: int = 252) -> float:
    """Full-sample annualized standard deviation."""
    return float(returns.std() * np.sqrt(periods_per_year))


def realized_volatility(
    returns: pd.Series, window: int = 21, periods_per_year: int = 252
) -> pd.Series:
    """Annualized realized volatility from the (non-demeaned) sum of squared returns."""
    realized_variance = (returns**2).rolling(window).sum() / window
    return np.sqrt(realized_variance * periods_per_year)


def garch_volatility(returns: pd.Series, periods_per_year: int = 252) -> pd.Series:
    """Fitted GARCH(1,1) conditional volatility, annualized, aligned to `returns.index`.

    Returns an all-NaN series (same index) if there isn't enough history to fit.
    """
    clean = returns.dropna()
    if len(clean) < 30:
        return pd.Series(index=returns.index, dtype=float)

    pct_returns = clean * 100  # arch converges more reliably on percent-scale returns
    model = arch_model(pct_returns, vol="GARCH", p=1, q=1, dist="normal", rescale=False)
    result = model.fit(disp="off")
    conditional_vol = result.conditional_volatility / 100 * np.sqrt(periods_per_year)
    return conditional_vol.reindex(returns.index)
