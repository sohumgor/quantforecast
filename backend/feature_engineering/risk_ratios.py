from __future__ import annotations

import numpy as np
import pandas as pd

_NEAR_ZERO = 1e-12


def sharpe_ratio(
    returns: pd.Series, risk_free_rate: float = 0.0, periods_per_year: int = 252
) -> float:
    excess = returns.dropna() - risk_free_rate / periods_per_year
    std = excess.std()
    if np.isnan(std) or abs(std) < _NEAR_ZERO:
        return float("nan")
    return float(excess.mean() / std * np.sqrt(periods_per_year))


def sortino_ratio(
    returns: pd.Series, risk_free_rate: float = 0.0, periods_per_year: int = 252
) -> float:
    excess = returns.dropna() - risk_free_rate / periods_per_year
    downside = excess.clip(upper=0)
    downside_std = np.sqrt((downside**2).mean())
    if np.isnan(downside_std) or abs(downside_std) < _NEAR_ZERO:
        return float("nan")
    return float(excess.mean() / downside_std * np.sqrt(periods_per_year))


def rolling_sharpe(
    returns: pd.Series,
    window: int = 63,
    risk_free_rate: float = 0.0,
    periods_per_year: int = 252,
) -> pd.Series:
    excess = returns - risk_free_rate / periods_per_year
    return (excess.rolling(window).mean() / excess.rolling(window).std()) * np.sqrt(
        periods_per_year
    )


def rolling_sortino(
    returns: pd.Series,
    window: int = 63,
    risk_free_rate: float = 0.0,
    periods_per_year: int = 252,
) -> pd.Series:
    excess = returns - risk_free_rate / periods_per_year
    downside = excess.clip(upper=0)
    downside_std = downside.rolling(window).apply(
        lambda x: np.sqrt(np.mean(np.square(x))), raw=True
    )
    return (excess.rolling(window).mean() / downside_std) * np.sqrt(periods_per_year)


def beta(returns: pd.Series, benchmark_returns: pd.Series) -> float:
    aligned = pd.concat([returns, benchmark_returns], axis=1, join="inner").dropna()
    if len(aligned) < 2:
        return float("nan")
    cov = aligned.iloc[:, 0].cov(aligned.iloc[:, 1])
    var = aligned.iloc[:, 1].var()
    if var == 0:
        return float("nan")
    return float(cov / var)


def rolling_beta(returns: pd.Series, benchmark_returns: pd.Series, window: int = 63) -> pd.Series:
    aligned = pd.concat([returns, benchmark_returns], axis=1, join="inner")
    aligned.columns = pd.Index(["asset", "benchmark"])
    cov = aligned["asset"].rolling(window).cov(aligned["benchmark"])
    var = aligned["benchmark"].rolling(window).var()
    return (cov / var).reindex(returns.index)
