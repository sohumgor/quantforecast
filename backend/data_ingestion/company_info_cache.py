from __future__ import annotations

import json
import os
import tempfile
from dataclasses import asdict
from pathlib import Path

from data_ingestion.schemas import CompanyInfo
from data_ingestion.yfinance_client import YFinanceClient


class CompanyInfoCache:
    """Read-through disk cache for `CompanyInfo`, one JSON file per ticker.
    Company name/description/website change essentially never, so unlike the
    price cache this has no time-window logic — a cache hit is just "the file
    exists."""

    def __init__(self, cache_dir: Path, client: YFinanceClient | None = None) -> None:
        self._cache_dir = cache_dir
        self._client = client or YFinanceClient()
        self._cache_dir.mkdir(parents=True, exist_ok=True)

    def get_or_fetch(self, ticker: str) -> CompanyInfo:
        cached = self._read_cached(ticker)
        if cached is not None:
            return cached

        info = self._client.fetch_company_info(ticker)
        self._write(info)
        return info

    def _path(self, ticker: str) -> Path:
        return self._cache_dir / f"{ticker.upper()}.json"

    def _read_cached(self, ticker: str) -> CompanyInfo | None:
        path = self._path(ticker)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text())
            return CompanyInfo(**data)
        except Exception:
            return None  # corrupted cache file degrades to a re-fetch

    def _write(self, info: CompanyInfo) -> None:
        path = self._path(info.ticker)
        fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix=".json.tmp")
        os.close(fd)
        try:
            Path(tmp_path).write_text(json.dumps(asdict(info)))
            os.replace(tmp_path, path)
        except BaseException:
            Path(tmp_path).unlink(missing_ok=True)
            raise
