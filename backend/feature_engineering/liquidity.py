from __future__ import annotations

import numpy as np
import pandas as pd


def volume_zscore(volume: pd.Series, window: int = 21) -> pd.Series:
    """How unusual today's volume is relative to its trailing rolling average."""
    mean = volume.rolling(window).mean()
    std = volume.rolling(window).std()
    return (volume - mean) / std


def amihud_illiquidity(
    returns: pd.Series, dollar_volume: pd.Series, window: int = 21
) -> pd.Series:
    """Rolling Amihud (2002) illiquidity: mean(|return| / dollar volume). Higher = less liquid."""
    daily_ratio = returns.abs() / dollar_volume.replace(0, np.nan)
    return daily_ratio.rolling(window).mean()


def turnover_proxy(volume: pd.Series, window: int = 21) -> pd.Series:
    """Rolling average daily share volume — a liquidity proxy absent shares-outstanding data."""
    return volume.rolling(window).mean()
