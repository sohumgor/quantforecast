from __future__ import annotations

from pathlib import Path

import pandas as pd


class ResultsStore:
    """Append-only persistence for raw per-window backtest results, keyed by a
    `run_id` (uuid + timestamp) so historical runs are never overwritten —
    a full audit trail under `research/backtests/`.
    """

    def __init__(self, root: Path) -> None:
        self._root = root

    def write(self, ticker: str, run_id: str, rows: pd.DataFrame) -> Path:
        self._root.mkdir(parents=True, exist_ok=True)
        path = self._path(ticker, run_id)
        rows.to_parquet(path)
        return path

    def read(self, ticker: str, run_id: str) -> pd.DataFrame:
        return pd.read_parquet(self._path(ticker, run_id))

    def list_runs(self, ticker: str) -> list[str]:
        if not self._root.exists():
            return []
        prefix = f"{ticker}_"
        run_ids = [p.stem[len(prefix) :] for p in self._root.glob(f"{prefix}*.parquet")]
        # `run_id` is `{uuid_hex}_{timestamp}`; sorting on the raw string would
        # order runs by their random uuid prefix, not chronologically. Sorting
        # on the trailing timestamp segment instead gives true run order (and
        # degrades gracefully for ids with no underscore, e.g. in tests).
        return sorted(run_ids, key=lambda r: r.rsplit("_", 1)[-1])

    def _path(self, ticker: str, run_id: str) -> Path:
        return self._root / f"{ticker}_{run_id}.parquet"
