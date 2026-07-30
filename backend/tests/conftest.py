from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from data_ingestion.schemas import PriceSeries


@pytest.fixture
def synthetic_prices() -> PriceSeries:
    """~1.2 years of synthetic daily OHLCV data with realistic noise."""
    rng = np.random.default_rng(42)
    n = 300
    idx = pd.date_range("2023-01-02", periods=n, freq="B")
    log_rets = rng.normal(0.0003, 0.015, n)
    prices = 100 * np.exp(np.cumsum(log_rets))
    volume = rng.integers(1_000_000, 5_000_000, n)
    bars = pd.DataFrame(
        {
            "open": prices,
            "high": prices * 1.005,
            "low": prices * 0.995,
            "close": prices,
            "adj_close": prices,
            "volume": volume,
        },
        index=pd.DatetimeIndex(idx, name="date"),
    )
    return PriceSeries(ticker="TEST", bars=bars)


@pytest.fixture
def synthetic_two_regime_prices() -> PriceSeries:
    """A calm ~low-vol segment followed by a turbulent, sharply-declining
    segment — for regime detection tests that need two clearly distinct
    volatility/drawdown profiles."""
    rng = np.random.default_rng(7)
    n_calm, n_crisis = 200, 200
    calm_returns = rng.normal(0.0004, 0.004, n_calm)
    crisis_returns = rng.normal(-0.004, 0.035, n_crisis)
    log_rets = np.concatenate([calm_returns, crisis_returns])
    prices = 100 * np.exp(np.cumsum(log_rets))
    idx = pd.date_range("2022-01-03", periods=len(prices), freq="B")
    volume = rng.integers(1_000_000, 5_000_000, len(prices))
    bars = pd.DataFrame(
        {
            "open": prices,
            "high": prices * 1.005,
            "low": prices * 0.995,
            "close": prices,
            "adj_close": prices,
            "volume": volume,
        },
        index=pd.DatetimeIndex(idx, name="date"),
    )
    return PriceSeries(ticker="TWOREGIME", bars=bars), n_calm


@pytest.fixture
def known_returns() -> pd.Series:
    """A short, hand-computable return series for closed-form statistic checks."""
    values = [0.01, -0.02, 0.015, -0.005, 0.02, -0.01, 0.005, 0.0, -0.015, 0.01]
    idx = pd.date_range("2024-01-01", periods=len(values), freq="B")
    return pd.Series(values, index=idx)
