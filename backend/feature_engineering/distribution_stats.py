from __future__ import annotations

import pandas as pd
from scipy import stats


def rolling_skewness(returns: pd.Series, window: int = 63) -> pd.Series:
    return returns.rolling(window).skew()


def rolling_kurtosis(returns: pd.Series, window: int = 63) -> pd.Series:
    """Excess kurtosis (normal distribution = 0)."""
    return returns.rolling(window).kurt()


def skewness(returns: pd.Series) -> float:
    return float(stats.skew(returns.dropna(), bias=False))


def kurtosis(returns: pd.Series) -> float:
    """Excess kurtosis (Fisher convention: normal distribution = 0)."""
    return float(stats.kurtosis(returns.dropna(), fisher=True, bias=False))


def jarque_bera(returns: pd.Series) -> tuple[float, float]:
    """Tests the null hypothesis that returns are normally distributed."""
    result = stats.jarque_bera(returns.dropna())
    return float(result.statistic), float(result.pvalue)
