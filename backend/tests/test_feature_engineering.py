from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from scipy import stats

from data_ingestion.schemas import PriceSeries
from feature_engineering import distribution_stats, drawdown, returns, risk_ratios, volatility
from feature_engineering.pipeline import FeatureEngineeringPipeline


class TestReturns:
    def test_simple_returns_recovers_known_series(self, known_returns: pd.Series) -> None:
        # prices[0] bakes in known_returns[0] with no prior price to diff against,
        # so pct_change() can only recover known_returns[1:].
        prices = 100 * (1 + known_returns).cumprod()
        recovered = returns.simple_returns(prices).dropna()
        np.testing.assert_allclose(recovered.values, known_returns.values[1:], rtol=1e-10)

    def test_log_returns_close_to_simple_for_small_moves(self) -> None:
        prices = pd.Series([100.0, 101.0, 99.0, 100.5])
        simple = returns.simple_returns(prices).dropna()
        log = returns.log_returns(prices).dropna()
        assert np.allclose(simple, log, atol=5e-3)


class TestRiskRatios:
    def test_sharpe_ratio_matches_hand_computation(self, known_returns: pd.Series) -> None:
        expected = known_returns.mean() / known_returns.std() * np.sqrt(252)
        actual = risk_ratios.sharpe_ratio(known_returns, risk_free_rate=0.0)
        assert actual == pytest.approx(expected)

    def test_sharpe_ratio_zero_std_returns_nan(self) -> None:
        constant = pd.Series([0.01] * 10)
        assert np.isnan(risk_ratios.sharpe_ratio(constant))

    def test_sortino_ratio_nan_when_no_downside(self) -> None:
        all_positive = pd.Series([0.01, 0.02, 0.015, 0.03])
        assert np.isnan(risk_ratios.sortino_ratio(all_positive))

    def test_beta_of_asset_vs_itself_is_one(self) -> None:
        rng = np.random.default_rng(1)
        r = pd.Series(rng.normal(0, 0.01, 100))
        assert risk_ratios.beta(r, r) == pytest.approx(1.0)


class TestVolatility:
    def test_historical_volatility_matches_hand_computation(self, known_returns: pd.Series) -> None:
        expected = known_returns.std() * np.sqrt(252)
        assert volatility.historical_volatility(known_returns) == pytest.approx(expected)

    def test_rolling_volatility_has_nan_before_window_fills(self) -> None:
        r = pd.Series(np.random.default_rng(2).normal(0, 0.01, 50))
        vol = volatility.rolling_volatility(r, window=21)
        assert vol.iloc[:20].isna().all()
        assert vol.iloc[20:].notna().all()


class TestDrawdown:
    def test_max_drawdown_known_series(self) -> None:
        prices = pd.Series([100, 110, 90, 95, 120, 80])
        # worst peak-to-trough: 120 -> 80 = -33.33%
        assert drawdown.max_drawdown(prices) == pytest.approx(-1 / 3, rel=1e-3)


class TestDistributionStats:
    def test_skewness_matches_scipy(self, known_returns: pd.Series) -> None:
        expected = stats.skew(known_returns, bias=False)
        assert distribution_stats.skewness(known_returns) == pytest.approx(expected)

    def test_kurtosis_matches_scipy(self, known_returns: pd.Series) -> None:
        expected = stats.kurtosis(known_returns, fisher=True, bias=False)
        assert distribution_stats.kurtosis(known_returns) == pytest.approx(expected)


class TestFeatureEngineeringPipeline:
    def test_transform_produces_expected_columns(self, synthetic_prices: PriceSeries) -> None:
        pipeline = FeatureEngineeringPipeline()
        feature_set = pipeline.transform(synthetic_prices)

        assert feature_set.ticker == "TEST"
        assert len(feature_set.frame) == len(synthetic_prices.bars)
        assert "rolling_vol_21d" in feature_set.frame.columns
        assert set(feature_set.metadata.keys()) == set(feature_set.frame.columns)

    def test_transform_with_benchmark_adds_beta_column(self, synthetic_prices: PriceSeries) -> None:
        rng = np.random.default_rng(7)
        idx = synthetic_prices.bars.index
        bench_prices = 100 * np.exp(np.cumsum(rng.normal(0.0002, 0.01, len(idx))))
        bench_bars = pd.DataFrame(
            {
                "open": bench_prices,
                "high": bench_prices * 1.005,
                "low": bench_prices * 0.995,
                "close": bench_prices,
                "adj_close": bench_prices,
                "volume": synthetic_prices.bars["volume"].to_numpy(),
            },
            index=idx,
        )
        benchmark = PriceSeries(ticker="BENCH", bars=bench_bars)

        pipeline = FeatureEngineeringPipeline(benchmark=benchmark)
        feature_set = pipeline.transform(synthetic_prices)

        assert "rolling_beta_63d" in feature_set.frame.columns
