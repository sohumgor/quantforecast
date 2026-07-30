from __future__ import annotations

import pandas as pd

from model_selection.lookup_table import PerformanceLookupTable


def update_lookup_table(
    ticker: str, aggregated_rows: pd.DataFrame, lookup: PerformanceLookupTable
) -> None:
    """Upserts (weighted-average, never overwrites) aggregated regime-conditioned
    backtest results into a ticker's performance lookup table — the only writer
    to `research/lookup_tables/per_ticker/{ticker}.parquet`. This is a
    file-mediated feedback edge: `backtesting` never imports `model_selection`'s
    `ModelSelectionEngine`, only its `PerformanceLookupTable` type.
    """
    lookup.upsert(aggregated_rows)
