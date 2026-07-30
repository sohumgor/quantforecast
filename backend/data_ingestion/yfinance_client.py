from __future__ import annotations

from datetime import date

import pandas as pd
import yfinance as yf

from data_ingestion.schemas import CompanyInfo, PriceSeries

_COLUMN_MAP = {
    "Open": "open",
    "High": "high",
    "Low": "low",
    "Close": "close",
    "Adj Close": "adj_close",
    "Volume": "volume",
}


class YFinanceClient:
    """Fetches OHLCV history from Yahoo Finance. The only module that imports yfinance."""

    def fetch_history(
        self, ticker: str, start: date, end: date, interval: str = "1d"
    ) -> PriceSeries:
        raw = yf.Ticker(ticker).history(
            start=start, end=end, interval=interval, auto_adjust=False
        )
        if raw.empty:
            raise ValueError(f"No price history returned for ticker '{ticker}'")

        raw = raw.rename(columns=_COLUMN_MAP)
        if "adj_close" not in raw.columns:
            # Some intervals/providers omit a distinct adjusted close.
            raw["adj_close"] = raw["close"]
        bars = raw[["open", "high", "low", "close", "adj_close", "volume"]].copy()
        bars.index = pd.DatetimeIndex(bars.index.date, name="date")
        return PriceSeries(ticker=ticker.upper(), bars=bars)

    def fetch_company_info(self, ticker: str) -> CompanyInfo:
        """Descriptive metadata for the hero section (name, full business
        summary, website) — display context only, no bearing on any
        forecast. The frontend truncates `description` for one-line display;
        returning the full summary here keeps that a presentation choice
        rather than something baked into the cached data."""
        info = yf.Ticker(ticker).info
        name = info.get("longName") or info.get("shortName") or ticker.upper()
        return CompanyInfo(
            ticker=ticker.upper(),
            name=name,
            description=info.get("longBusinessSummary") or "",
            website=info.get("website"),
            sector=info.get("sector"),
            industry=info.get("industry"),
        )
