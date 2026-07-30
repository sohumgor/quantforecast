from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from data_ingestion.schemas import PriceSeries
from feature_engineering import (
    autocorrelation,
    distribution_stats,
    drawdown,
    liquidity,
    momentum_trend,
    risk_ratios,
    volatility,
)
from feature_engineering import (
    returns as returns_mod,
)
from feature_engineering.feature_set import FeatureSet

FEATURE_DESCRIPTIONS: dict[str, str] = {
    "return": "Simple daily percentage return.",
    "log_return": "Log (continuously compounded) daily return.",
    "rolling_vol_21d": "Annualized volatility over the trailing 21 trading days.",
    "rolling_vol_63d": "Annualized volatility over the trailing 63 trading days.",
    "realized_vol_21d": "Annualized realized volatility from summed squared returns over 21 days.",
    "garch_vol": "Annualized conditional volatility from a fitted GARCH(1,1) model.",
    "momentum_10d": "Total return over the trailing 10 trading days.",
    "momentum_20d": "Total return over the trailing 20 trading days.",
    "momentum_60d": "Total return over the trailing 60 trading days.",
    "trend_strength_50d": "Annualized slope of log price over the trailing 50 trading days.",
    "drawdown": "Percentage decline from the running historical peak price.",
    "rolling_sharpe_63d": "Annualized Sharpe ratio over the trailing 63 trading days.",
    "rolling_sortino_63d": "Annualized Sortino ratio over the trailing 63 trading days.",
    "rolling_skew_63d": "Skewness of returns over the trailing 63 trading days.",
    "rolling_kurtosis_63d": "Excess kurtosis of returns over the trailing 63 trading days.",
    "rolling_autocorr_lag1_21d": "Lag-1 autocorrelation of returns over the trailing 21 days.",
    "volume_zscore_21d": "Z-score of trading volume relative to its trailing 21-day average.",
    "amihud_illiquidity_21d": "Trailing 21-day Amihud illiquidity ratio (higher = less liquid).",
    "rolling_beta_63d": "Rolling beta vs. the benchmark over the trailing 63 trading days.",
}


@dataclass(frozen=True)
class FeatureConfig:
    vol_window_short: int = 21
    vol_window_long: int = 63
    momentum_windows: tuple[int, ...] = (10, 20, 60)
    trend_window: int = 50
    ratio_window: int = 63
    dist_window: int = 63
    autocorr_window: int = 21
    liquidity_window: int = 21
    periods_per_year: int = 252
    risk_free_rate: float = 0.0


class FeatureEngineeringPipeline:
    """Turns a `PriceSeries` into a typed `FeatureSet` of engineered statistical features."""

    def __init__(
        self, benchmark: PriceSeries | None = None, config: FeatureConfig | None = None
    ) -> None:
        self._benchmark = benchmark
        self._config = config or FeatureConfig()

    def transform(self, prices: PriceSeries) -> FeatureSet:
        cfg = self._config
        close = prices.bars["adj_close"]

        frame = pd.DataFrame(index=prices.bars.index)
        frame["return"] = returns_mod.simple_returns(close)
        frame["log_return"] = returns_mod.log_returns(close)

        log_ret = frame["log_return"]
        frame["rolling_vol_21d"] = volatility.rolling_volatility(
            log_ret, cfg.vol_window_short, cfg.periods_per_year
        )
        frame["rolling_vol_63d"] = volatility.rolling_volatility(
            log_ret, cfg.vol_window_long, cfg.periods_per_year
        )
        frame["realized_vol_21d"] = volatility.realized_volatility(
            log_ret, cfg.vol_window_short, cfg.periods_per_year
        )
        frame["garch_vol"] = volatility.garch_volatility(log_ret, cfg.periods_per_year)

        for window in cfg.momentum_windows:
            frame[f"momentum_{window}d"] = momentum_trend.momentum(close, window)
        frame[f"trend_strength_{cfg.trend_window}d"] = momentum_trend.trend_strength(
            close, cfg.trend_window, cfg.periods_per_year
        )

        frame["drawdown"] = drawdown.rolling_drawdown(close)

        frame[f"rolling_sharpe_{cfg.ratio_window}d"] = risk_ratios.rolling_sharpe(
            frame["return"], cfg.ratio_window, cfg.risk_free_rate, cfg.periods_per_year
        )
        frame[f"rolling_sortino_{cfg.ratio_window}d"] = risk_ratios.rolling_sortino(
            frame["return"], cfg.ratio_window, cfg.risk_free_rate, cfg.periods_per_year
        )

        frame[f"rolling_skew_{cfg.dist_window}d"] = distribution_stats.rolling_skewness(
            frame["return"], cfg.dist_window
        )
        frame[f"rolling_kurtosis_{cfg.dist_window}d"] = distribution_stats.rolling_kurtosis(
            frame["return"], cfg.dist_window
        )

        frame[f"rolling_autocorr_lag1_{cfg.autocorr_window}d"] = (
            autocorrelation.rolling_autocorrelation(
                frame["return"], lag=1, window=cfg.autocorr_window
            )
        )

        frame[f"volume_zscore_{cfg.liquidity_window}d"] = liquidity.volume_zscore(
            prices.bars["volume"], cfg.liquidity_window
        )
        dollar_volume = prices.bars["adj_close"] * prices.bars["volume"]
        frame[f"amihud_illiquidity_{cfg.liquidity_window}d"] = liquidity.amihud_illiquidity(
            frame["return"], dollar_volume, cfg.liquidity_window
        )

        if self._benchmark is not None:
            bench_returns = returns_mod.simple_returns(self._benchmark.bars["adj_close"])
            frame[f"rolling_beta_{cfg.ratio_window}d"] = risk_ratios.rolling_beta(
                frame["return"], bench_returns, cfg.ratio_window
            )

        latest = frame.iloc[-1]
        return FeatureSet(
            ticker=prices.ticker,
            frame=frame,
            latest=latest,
            metadata={col: FEATURE_DESCRIPTIONS.get(col, "") for col in frame.columns},
        )
