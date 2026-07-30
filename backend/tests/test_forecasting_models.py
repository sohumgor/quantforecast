from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from scipy.stats import kurtosis

from forecasting_models.egarch import EGARCHModel
from forecasting_models.garch import Garch11Model
from forecasting_models.gbm import GBMParams, GeometricBrownianMotionModel
from forecasting_models.heston import HestonModel
from forecasting_models.historical_bootstrap import HistoricalBootstrapModel
from forecasting_models.jump_diffusion import MertonJumpDiffusionModel
from forecasting_models.regime_switching import RegimeSwitchingModel
from forecasting_models.registry import list_models


class TestGBM:
    def test_simulate_matches_analytic_moments(self) -> None:
        model = GeometricBrownianMotionModel()
        params = GBMParams(mu=0.08, sigma=0.25)
        rng = np.random.default_rng(1)

        paths = model.simulate(params, n_sims=50_000, horizon_days=252, start_price=100.0, rng=rng)
        terminal = paths[:, -1]

        theoretical_mean = 100 * np.exp(params.mu)
        theoretical_var = (
            100**2 * np.exp(2 * params.mu) * (np.exp(params.sigma**2) - 1)
        )
        assert terminal.mean() == pytest.approx(theoretical_mean, rel=0.02)
        assert terminal.var() == pytest.approx(theoretical_var, rel=0.05)

    def test_calibration_is_unbiased_across_seeds(self) -> None:
        model = GeometricBrownianMotionModel()
        true_mu, true_sigma = 0.08, 0.25
        dt = 1 / 252
        estimated_mus = []
        for seed in range(15):
            rng = np.random.default_rng(seed)
            n = 252 * 15
            log_rets = rng.normal((true_mu - 0.5 * true_sigma**2) * dt, true_sigma * np.sqrt(dt), n)
            prices = pd.Series(100 * np.exp(np.cumsum(log_rets)))
            returns = prices.pct_change().dropna()
            estimated_mus.append(model.calibrate(returns).mu)

        assert np.mean(estimated_mus) == pytest.approx(true_mu, abs=0.06)

    def test_calibrate_raises_on_insufficient_history(self) -> None:
        model = GeometricBrownianMotionModel()
        with pytest.raises(ValueError, match="Need at least 30"):
            model.calibrate(pd.Series([0.01, -0.01]))


class TestGarch11:
    def test_recovers_volatility_persistence(self) -> None:
        rng = np.random.default_rng(0)
        n = 1200
        sigma2 = np.zeros(n)
        r = np.zeros(n)
        sigma2[0] = 0.0001
        for t in range(1, n):
            sigma2[t] = 0.00001 + 0.08 * r[t - 1] ** 2 + 0.88 * sigma2[t - 1]
            r[t] = 0.0002 + np.sqrt(sigma2[t]) * rng.standard_normal()
        returns = pd.Series(r)

        model = Garch11Model()
        params = model.calibrate(returns)

        assert params.alpha > 0
        assert params.beta > 0
        assert params.alpha + params.beta == pytest.approx(0.96, abs=0.1)

    def test_simulated_paths_are_positive_and_exhibit_vol_clustering(self) -> None:
        rng = np.random.default_rng(0)
        n = 800
        sigma2 = np.zeros(n)
        r = np.zeros(n)
        sigma2[0] = 0.0001
        for t in range(1, n):
            sigma2[t] = 0.00001 + 0.08 * r[t - 1] ** 2 + 0.88 * sigma2[t - 1]
            r[t] = 0.0002 + np.sqrt(sigma2[t]) * rng.standard_normal()
        returns = pd.Series(r)

        model = Garch11Model()
        params = model.calibrate(returns)
        paths = model.simulate(
            params, n_sims=2000, horizon_days=252, start_price=100.0, rng=np.random.default_rng(1)
        )

        assert paths.shape == (2000, 252)
        assert (paths > 0).all()

        sim_returns = paths[:, 1:] / paths[:, :-1] - 1
        squared = sim_returns**2
        lag1_autocorr = np.mean(
            [np.corrcoef(squared[i, :-1], squared[i, 1:])[0, 1] for i in range(300)]
        )
        assert lag1_autocorr > 0

    def test_calibrate_raises_on_insufficient_history(self) -> None:
        model = Garch11Model()
        with pytest.raises(ValueError, match="Need at least 100"):
            model.calibrate(pd.Series(np.zeros(10)))


class TestEGARCH:
    def test_recovers_negative_leverage_asymmetry(self) -> None:
        rng = np.random.default_rng(0)
        n = 1200
        z = rng.standard_normal(n)
        log_sigma2 = np.zeros(n)
        r = np.zeros(n)
        log_sigma2[0] = np.log(0.0001)
        for t in range(1, n):
            prev_z = z[t - 1]
            asymmetry = 0.15 * (abs(prev_z) - np.sqrt(2 / np.pi)) - 0.1 * prev_z
            log_sigma2[t] = -0.1 + 0.9 * log_sigma2[t - 1] + asymmetry
            sigma = np.exp(0.5 * log_sigma2[t])
            r[t] = 0.0002 + sigma * z[t]
        returns = pd.Series(r)

        model = EGARCHModel()
        params = model.calibrate(returns)

        assert params.gamma < 0  # negative shocks raise volatility more than positive ones

    def test_simulated_paths_are_positive(self) -> None:
        rng = np.random.default_rng(0)
        n = 800
        returns = pd.Series(rng.normal(0.0003, 0.015, n))
        model = EGARCHModel()
        params = model.calibrate(returns)
        paths = model.simulate(
            params, n_sims=1000, horizon_days=126, start_price=100.0, rng=np.random.default_rng(2)
        )
        assert paths.shape == (1000, 126)
        assert (paths > 0).all()


class TestHistoricalBootstrap:
    def test_simulated_returns_are_drawn_from_the_historical_pool(self) -> None:
        rng = np.random.default_rng(3)
        returns = pd.Series(rng.normal(0.0004, 0.015, 300))
        model = HistoricalBootstrapModel(block_size=1)
        params = model.calibrate(returns)

        paths = model.simulate(
            params, n_sims=50, horizon_days=20, start_price=100.0, rng=np.random.default_rng(4)
        )
        sim_returns = paths[:, 1:] / paths[:, :-1] - 1
        pool = np.array(params.returns_pool)

        # every simulated daily return must be exactly a pool value (no leakage/synthesis)
        assert np.isin(np.round(sim_returns, 12), np.round(pool, 12)).all()

    def test_block_bootstrap_produces_valid_positive_paths(self) -> None:
        rng = np.random.default_rng(3)
        returns = pd.Series(rng.normal(0.0004, 0.015, 300))
        model = HistoricalBootstrapModel(block_size=10)
        params = model.calibrate(returns)
        paths = model.simulate(
            params, n_sims=200, horizon_days=63, start_price=100.0, rng=np.random.default_rng(4)
        )
        assert paths.shape == (200, 63)
        assert (paths > 0).all()

    def test_calibrate_raises_on_insufficient_history(self) -> None:
        model = HistoricalBootstrapModel()
        with pytest.raises(ValueError, match="Need at least"):
            model.calibrate(pd.Series([0.01, -0.01]))


class TestMertonJumpDiffusion:
    def test_simulated_returns_are_fatter_tailed_than_pure_diffusion(self) -> None:
        rng = np.random.default_rng(5)
        n = 1500
        diffusion = rng.normal(0.0002, 0.01, n)
        jump_days = rng.random(n) < 0.02
        jumps = np.where(jump_days, rng.normal(-0.03, 0.02, n), 0.0)
        prices = pd.Series(100 * np.exp(np.cumsum(diffusion + jumps)))
        returns = prices.pct_change().dropna()

        model = MertonJumpDiffusionModel()
        params = model.calibrate(returns)
        paths = model.simulate(
            params, n_sims=20_000, horizon_days=126, start_price=100.0, rng=np.random.default_rng(6)
        )

        assert (paths > 0).all()
        sim_returns = paths[:, 1:] / paths[:, :-1] - 1
        assert kurtosis(sim_returns.flatten()) > 0

    def test_calibrate_raises_on_insufficient_history(self) -> None:
        model = MertonJumpDiffusionModel()
        with pytest.raises(ValueError, match="Need at least 100"):
            model.calibrate(pd.Series(np.zeros(10)))


class TestPlaceholderModels:
    def test_heston_simulate_raises_not_implemented(self) -> None:
        model = HestonModel()
        with pytest.raises(NotImplementedError):
            model.calibrate(pd.Series([0.01, -0.01, 0.02]))

    def test_regime_switching_simulate_raises_not_implemented(self) -> None:
        model = RegimeSwitchingModel()
        with pytest.raises(NotImplementedError):
            model.calibrate(pd.Series([0.01, -0.01, 0.02]))


class TestModelRegistry:
    def test_five_models_are_implemented(self) -> None:
        implemented = {m.name for m in list_models(only_implemented=True)}
        assert implemented == {
            "gbm",
            "garch11",
            "egarch",
            "historical_bootstrap",
            "merton_jump_diffusion",
        }

    def test_placeholders_are_not_implemented(self) -> None:
        all_models = {m.name: m.is_implemented for m in list_models()}
        assert all_models["heston"] is False
        assert all_models["regime_switching"] is False
