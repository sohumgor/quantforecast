from __future__ import annotations

from datetime import date
from pathlib import Path
from unittest.mock import MagicMock

import pandas as pd
import pytest

from data_ingestion.cache import ParquetPriceCache
from data_ingestion.company_info_cache import CompanyInfoCache
from data_ingestion.schemas import PRICE_COLUMNS, CompanyInfo, PriceSeries
from data_ingestion.yfinance_client import YFinanceClient


def _make_series(ticker: str, start: str, periods: int) -> PriceSeries:
    idx = pd.date_range(start, periods=periods, freq="B")
    data = {col: list(range(periods)) for col in PRICE_COLUMNS}
    bars = pd.DataFrame(data, index=pd.DatetimeIndex(idx, name="date"), dtype=float)
    return PriceSeries(ticker=ticker, bars=bars)


class TestPriceSeries:
    def test_requires_all_price_columns(self) -> None:
        bad = pd.DataFrame({"open": [1.0]}, index=pd.date_range("2024-01-01", periods=1))
        with pytest.raises(ValueError, match="missing required columns"):
            PriceSeries(ticker="X", bars=bad)

    def test_rejects_empty_frame(self) -> None:
        empty = pd.DataFrame(columns=list(PRICE_COLUMNS))
        with pytest.raises(ValueError, match="no rows"):
            PriceSeries(ticker="X", bars=empty)


class TestYFinanceClient:
    def test_fetch_history_normalizes_columns(self, monkeypatch: pytest.MonkeyPatch) -> None:
        raw = pd.DataFrame(
            {
                "Open": [1.0, 2.0],
                "High": [1.1, 2.1],
                "Low": [0.9, 1.9],
                "Close": [1.05, 2.05],
                "Adj Close": [1.0, 2.0],
                "Volume": [100, 200],
            },
            index=pd.date_range("2024-01-01", periods=2, tz="America/New_York"),
        )
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = raw
        monkeypatch.setattr("data_ingestion.yfinance_client.yf.Ticker", lambda _: mock_ticker)

        client = YFinanceClient()
        series = client.fetch_history("aapl", date(2024, 1, 1), date(2024, 1, 3))

        assert series.ticker == "AAPL"
        assert list(series.bars.columns) == list(PRICE_COLUMNS)
        assert len(series.bars) == 2

    def test_raises_on_empty_history(self, monkeypatch: pytest.MonkeyPatch) -> None:
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = pd.DataFrame()
        monkeypatch.setattr("data_ingestion.yfinance_client.yf.Ticker", lambda _: mock_ticker)

        client = YFinanceClient()
        with pytest.raises(ValueError, match="No price history"):
            client.fetch_history("BADTICKER", date(2024, 1, 1), date(2024, 1, 3))


class TestParquetPriceCache:
    def test_miss_then_hit_uses_client_once(self, tmp_path: Path) -> None:
        series = _make_series("TEST", "2024-01-01", 10)  # covers Jan 1 - Jan 12, 2024
        mock_client = MagicMock()
        mock_client.fetch_history.return_value = series
        cache = ParquetPriceCache(cache_dir=tmp_path, client=mock_client)

        first = cache.get_or_fetch("TEST", date(2024, 1, 1), date(2024, 1, 10))
        second = cache.get_or_fetch("TEST", date(2024, 1, 1), date(2024, 1, 10))

        assert mock_client.fetch_history.call_count == 1
        # Jan 1-10, 2024 spans 8 business days (Jan 1-5, 8-10); both the
        # cache-miss and cache-hit paths window-slice to the requested range.
        assert len(first.bars) == len(second.bars) == 8

    def test_invalidate_removes_cache_file(self, tmp_path: Path) -> None:
        series = _make_series("TEST", "2024-01-01", 5)
        mock_client = MagicMock()
        mock_client.fetch_history.return_value = series
        cache = ParquetPriceCache(cache_dir=tmp_path, client=mock_client)

        cache.get_or_fetch("TEST", date(2024, 1, 1), date(2024, 1, 5))
        assert (tmp_path / "TEST.parquet").exists()

        cache.invalidate("TEST")
        assert not (tmp_path / "TEST.parquet").exists()

    def test_stale_cache_outside_window_triggers_refetch(self, tmp_path: Path) -> None:
        first_series = _make_series("TEST", "2024-01-01", 5)  # Jan 1 - Jan 5
        second_series = _make_series("TEST", "2024-02-01", 5)  # Jan 1 window doesn't cover Feb
        mock_client = MagicMock()
        mock_client.fetch_history.side_effect = [first_series, second_series]
        cache = ParquetPriceCache(cache_dir=tmp_path, client=mock_client)

        cache.get_or_fetch("TEST", date(2024, 1, 1), date(2024, 1, 5))
        cache.get_or_fetch("TEST", date(2024, 2, 1), date(2024, 2, 5))

        assert mock_client.fetch_history.call_count == 2

    def test_corrupted_cache_file_degrades_to_refetch(self, tmp_path: Path) -> None:
        # Simulates a process killed mid-write, leaving a truncated file.
        (tmp_path / "TEST.parquet").write_bytes(b"not a real parquet file")

        series = _make_series("TEST", "2024-01-01", 5)
        mock_client = MagicMock()
        mock_client.fetch_history.return_value = series
        cache = ParquetPriceCache(cache_dir=tmp_path, client=mock_client)

        result = cache.get_or_fetch("TEST", date(2024, 1, 1), date(2024, 1, 5))

        assert mock_client.fetch_history.call_count == 1
        assert len(result.bars) == 5
        # the corrupted file should have been cleanly overwritten
        assert pd.read_parquet(tmp_path / "TEST.parquet") is not None


class TestCompanyInfoCache:
    def test_miss_then_hit_uses_client_once(self, tmp_path: Path) -> None:
        info = CompanyInfo(
            ticker="TEST",
            name="Test Corp.",
            description="Makes test fixtures.",
            website="https://test.example",
            sector="Technology",
            industry="Software",
        )
        mock_client = MagicMock()
        mock_client.fetch_company_info.return_value = info
        cache = CompanyInfoCache(cache_dir=tmp_path, client=mock_client)

        first = cache.get_or_fetch("TEST")
        second = cache.get_or_fetch("TEST")

        assert mock_client.fetch_company_info.call_count == 1
        assert first == second == info

    def test_corrupted_cache_file_degrades_to_refetch(self, tmp_path: Path) -> None:
        (tmp_path / "TEST.json").write_text("not valid json")

        info = CompanyInfo(
            ticker="TEST",
            name="Test Corp.",
            description="Makes test fixtures.",
            website=None,
            sector=None,
            industry=None,
        )
        mock_client = MagicMock()
        mock_client.fetch_company_info.return_value = info
        cache = CompanyInfoCache(cache_dir=tmp_path, client=mock_client)

        result = cache.get_or_fetch("TEST")

        assert mock_client.fetch_company_info.call_count == 1
        assert result == info
