from __future__ import annotations

import pandas as pd
from statsmodels.stats.diagnostic import acorr_ljungbox


def rolling_autocorrelation(returns: pd.Series, lag: int = 1, window: int = 21) -> pd.Series:
    """Rolling lag-`lag` autocorrelation of returns."""
    shifted = returns.shift(lag)
    return returns.rolling(window).corr(shifted)


def ljung_box_stat(returns: pd.Series, lags: int = 10) -> tuple[float, float]:
    """Full-sample Ljung-Box statistic/p-value testing serial correlation up to `lags`."""
    clean = returns.dropna()
    result = acorr_ljungbox(clean, lags=[lags], return_df=True)
    return float(result["lb_stat"].iloc[0]), float(result["lb_pvalue"].iloc[0])
