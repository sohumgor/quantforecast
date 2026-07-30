from __future__ import annotations

from collections.abc import Iterator

import numpy as np
import pandas as pd

from backtesting.contracts import BacktestConfig

MIN_TRAIN_ROWS = 30


def generate_windows(
    config: BacktestConfig, prices: pd.Series
) -> Iterator[tuple[pd.Series, pd.Series]]:
    """Yields (train_slice, actual_future_slice) pairs via expanding-window
    walk-forward validation: `prices` is a single price series (e.g. adjusted
    close) indexed by date. At each step through the test period (stepping by
    `config.window_step_days` trading days), `train_slice` is all history from
    `config.train_start` up to and including that step's forecast origin, and
    `actual_future_slice` is the `config.horizon_days` of actual prices
    immediately following it.

    Windows without a full `horizon_days` of future data remaining, or with
    fewer than `MIN_TRAIN_ROWS` of training history, are skipped.
    """
    dates = pd.DatetimeIndex(prices.index)
    test_mask = (dates.date >= config.test_start) & (dates.date <= config.test_end)
    test_positions = np.flatnonzero(test_mask)

    for origin_pos in test_positions[:: config.window_step_days]:
        future_start = origin_pos + 1
        future_end = origin_pos + config.horizon_days  # inclusive position
        if future_end >= len(dates):
            break  # not enough future data left for a full horizon

        train_slice = prices.iloc[: origin_pos + 1]
        train_slice = train_slice[pd.DatetimeIndex(train_slice.index).date >= config.train_start]
        if len(train_slice) < MIN_TRAIN_ROWS:
            continue

        actual_future_slice = prices.iloc[future_start : future_end + 1]
        yield train_slice, actual_future_slice
