from __future__ import annotations

import numpy as np
import pandas as pd


def simple_returns(prices: pd.Series) -> pd.Series:
    return prices.pct_change()


def log_returns(prices: pd.Series) -> pd.Series:
    return pd.Series(np.log(prices)).diff()
