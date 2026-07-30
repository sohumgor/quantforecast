from __future__ import annotations

import os
import tempfile
from datetime import date
from pathlib import Path

import pandas as pd

from data_ingestion.schemas import PriceSeries
from data_ingestion.yfinance_client import YFinanceClient


class ParquetPriceCache:
    """Read-through disk cache for OHLCV history, backed by one Parquet file per ticker."""

    def __init__(self, cache_dir: Path, client: YFinanceClient | None = None) -> None:
        self._cache_dir = cache_dir
        self._client = client or YFinanceClient()
        self._cache_dir.mkdir(parents=True, exist_ok=True)

    def get_or_fetch(
        self, ticker: str, start: date, end: date, interval: str = "1d"
    ) -> PriceSeries:
        cached = self._read_cached(ticker)
        if cached is not None and _covers(cached, start, end):
            window = cached.loc[str(start) : str(end)]
            if not window.empty:
                return PriceSeries(ticker=ticker.upper(), bars=window)

        series = self._client.fetch_history(ticker, start, end, interval)
        self._merge_and_write(series, existing=cached)
        window = series.bars.loc[str(start) : str(end)]
        return PriceSeries(ticker=ticker.upper(), bars=window if not window.empty else series.bars)

    def invalidate(self, ticker: str) -> None:
        path = self._path(ticker)
        if path.exists():
            path.unlink()

    def _path(self, ticker: str) -> Path:
        return self._cache_dir / f"{ticker.upper()}.parquet"

    def _read_cached(self, ticker: str) -> pd.DataFrame | None:
        path = self._path(ticker)
        if not path.exists():
            return None
        try:
            return pd.read_parquet(path)
        except Exception:
            # A corrupted/truncated cache file (e.g. from a process killed
            # mid-write) should degrade to a cache miss, not a hard failure.
            return None

    def _merge_and_write(self, series: PriceSeries, existing: pd.DataFrame | None) -> None:
        path = self._path(series.ticker)
        if existing is not None:
            merged = pd.concat([existing, series.bars])
            merged = merged[~merged.index.duplicated(keep="last")].sort_index()
        else:
            merged = series.bars

        # Write-then-rename is atomic on POSIX, so a process killed mid-write
        # can never leave a truncated/corrupted parquet file at `path`.
        fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix=".parquet.tmp")
        os.close(fd)
        try:
            merged.to_parquet(tmp_path)
            os.replace(tmp_path, path)
        except BaseException:
            Path(tmp_path).unlink(missing_ok=True)
            raise


def _covers(cached: pd.DataFrame, start: date, end: date) -> bool:
    if cached.empty:
        return False
    return cached.index.min().date() <= start and cached.index.max().date() >= end
