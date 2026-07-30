from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

PRICE_COLUMNS: tuple[str, ...] = ("open", "high", "low", "close", "adj_close", "volume")


@dataclass(frozen=True)
class PriceSeries:
    """Daily OHLCV history for a single ticker.

    `bars` is indexed by a tz-naive `DatetimeIndex` named "date" and carries
    exactly `PRICE_COLUMNS`. This is a pure data container — derived
    statistics (returns, volatility, etc.) live in `feature_engineering`.
    """

    ticker: str
    bars: pd.DataFrame

    def __post_init__(self) -> None:
        missing = [c for c in PRICE_COLUMNS if c not in self.bars.columns]
        if missing:
            raise ValueError(f"PriceSeries.bars missing required columns: {missing}")
        if self.bars.empty:
            raise ValueError(f"PriceSeries for '{self.ticker}' has no rows")


@dataclass(frozen=True)
class CompanyInfo:
    """Descriptive (non-financial) metadata about a ticker's issuing company —
    used only for display context (hero section), never for forecasting."""

    ticker: str
    name: str
    description: str
    website: str | None
    sector: str | None
    industry: str | None
