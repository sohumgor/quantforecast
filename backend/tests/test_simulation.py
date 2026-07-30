from __future__ import annotations

import numpy as np
import pytest

from forecasting_models.gbm import GBMParams, GeometricBrownianMotionModel
from simulation.monte_carlo_runner import MonteCarloRunner


class TestMonteCarloRunner:
    def test_run_produces_correct_shape_and_metadata(self) -> None:
        model = GeometricBrownianMotionModel()
        params = GBMParams(mu=0.08, sigma=0.2)
        runner = MonteCarloRunner()

        result = runner.run(
            "AAPL", model, params, n_sims=100, horizon_days=21, start_price=150.0, seed=1
        )

        assert result.ticker == "AAPL"
        assert result.model_name == "gbm"
        assert result.paths.shape == (100, 21)
        assert np.array_equal(result.terminal_values, result.paths[:, -1])
        assert result.dt == pytest.approx(1 / 252)

    def test_reproducible_with_fixed_seed(self) -> None:
        model = GeometricBrownianMotionModel()
        params = GBMParams(mu=0.05, sigma=0.25)
        runner = MonteCarloRunner()

        first = runner.run(
            "TEST", model, params, n_sims=500, horizon_days=10, start_price=100.0, seed=42
        )
        second = runner.run(
            "TEST", model, params, n_sims=500, horizon_days=10, start_price=100.0, seed=42
        )

        assert np.array_equal(first.paths, second.paths)

    def test_different_seeds_produce_different_paths(self) -> None:
        model = GeometricBrownianMotionModel()
        params = GBMParams(mu=0.05, sigma=0.25)
        runner = MonteCarloRunner()

        first = runner.run(
            "TEST", model, params, n_sims=500, horizon_days=10, start_price=100.0, seed=1
        )
        second = runner.run(
            "TEST", model, params, n_sims=500, horizon_days=10, start_price=100.0, seed=2
        )

        assert not np.array_equal(first.paths, second.paths)

    def test_raises_on_non_positive_n_sims(self) -> None:
        model = GeometricBrownianMotionModel()
        params = GBMParams(mu=0.05, sigma=0.25)
        runner = MonteCarloRunner()
        with pytest.raises(ValueError, match="n_sims"):
            runner.run("TEST", model, params, n_sims=0, horizon_days=10, start_price=100.0)

    def test_raises_on_non_positive_horizon_days(self) -> None:
        model = GeometricBrownianMotionModel()
        params = GBMParams(mu=0.05, sigma=0.25)
        runner = MonteCarloRunner()
        with pytest.raises(ValueError, match="horizon_days"):
            runner.run("TEST", model, params, n_sims=100, horizon_days=0, start_price=100.0)
