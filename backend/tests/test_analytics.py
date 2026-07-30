from __future__ import annotations

import numpy as np
import pytest
from scipy import stats

from analytics.distribution_summary import RiskAnalyticsBuilder, summarize_distribution
from analytics.risk_metrics import expected_shortfall, max_drawdown_distribution, value_at_risk
from forecasting_models.gbm import GBMParams, GeometricBrownianMotionModel
from simulation.monte_carlo_runner import MonteCarloRunner


@pytest.fixture
def normal_terminal_returns() -> tuple[np.ndarray, float, float]:
    """A large i.i.d. Normal(mu, sigma^2) sample, for closed-form VaR/ES checks."""
    mu, sigma = 0.02, 0.15
    rng = np.random.default_rng(0)
    return rng.normal(mu, sigma, 500_000), mu, sigma


class TestValueAtRisk:
    def test_matches_closed_form_for_normal_distribution(
        self, normal_terminal_returns: tuple[np.ndarray, float, float]
    ) -> None:
        returns, mu, sigma = normal_terminal_returns
        alpha = 0.05
        z_alpha = stats.norm.ppf(alpha)
        expected_var = -(mu + sigma * z_alpha)

        assert value_at_risk(returns, alpha) == pytest.approx(expected_var, abs=0.01)

    def test_raises_on_invalid_alpha(self) -> None:
        with pytest.raises(ValueError, match="alpha"):
            value_at_risk(np.array([0.01, -0.01]), alpha=1.5)


class TestExpectedShortfall:
    def test_matches_closed_form_for_normal_distribution(
        self, normal_terminal_returns: tuple[np.ndarray, float, float]
    ) -> None:
        returns, mu, sigma = normal_terminal_returns
        alpha = 0.05
        z_alpha = stats.norm.ppf(alpha)
        expected_es = -mu + sigma * stats.norm.pdf(z_alpha) / alpha

        assert expected_shortfall(returns, alpha) == pytest.approx(expected_es, abs=0.01)

    def test_es_is_always_at_least_var(
        self, normal_terminal_returns: tuple[np.ndarray, float, float]
    ) -> None:
        returns, _, _ = normal_terminal_returns
        assert expected_shortfall(returns, 0.05) >= value_at_risk(returns, 0.05)

    def test_raises_on_invalid_alpha(self) -> None:
        with pytest.raises(ValueError, match="alpha"):
            expected_shortfall(np.array([0.01, -0.01]), alpha=0.0)


class TestMaxDrawdownDistribution:
    def test_monotonically_increasing_path_has_no_drawdown(self) -> None:
        paths = np.array([[101.0, 102.0, 103.0, 104.0]])
        stats_result = max_drawdown_distribution(paths)
        assert stats_result.mean_max_drawdown == pytest.approx(0.0)

    def test_known_drawdown_matches_hand_computation(self) -> None:
        # peak 110 -> trough 90 = -18.18%; peak 120 -> trough 80 = -33.33%
        paths = np.array([[100, 110, 90, 95, 120, 80]], dtype=float)
        result = max_drawdown_distribution(paths)
        assert result.mean_max_drawdown == pytest.approx(-1 / 3, rel=1e-6)

    def test_start_price_captures_immediate_decline(self) -> None:
        # Without a start_price reference, day-1 can never show a drawdown
        # relative to itself.
        paths = np.array([[90.0, 95.0, 100.0]])
        without_start = max_drawdown_distribution(paths)
        with_start = max_drawdown_distribution(paths, start_price=100.0)

        assert without_start.mean_max_drawdown == pytest.approx(0.0)
        assert with_start.mean_max_drawdown == pytest.approx(-0.10, rel=1e-6)


class TestSummarizeDistribution:
    def test_tail_and_ci_ordering(
        self, normal_terminal_returns: tuple[np.ndarray, float, float]
    ) -> None:
        returns, _, _ = normal_terminal_returns
        summary = summarize_distribution(returns)

        assert (
            summary.worst_5pct
            <= summary.ci_lower_90
            <= summary.median_return
            <= summary.ci_upper_90
            <= summary.best_5pct
        )

    def test_prob_positive_return_matches_hand_computation(self) -> None:
        returns = np.array([0.05, -0.02, 0.01, -0.03, 0.0, 0.02])
        summary = summarize_distribution(returns)
        assert summary.prob_positive_return == pytest.approx(3 / 6)


class TestRiskAnalyticsBuilder:
    def test_build_end_to_end_is_internally_coherent(self) -> None:
        model = GeometricBrownianMotionModel()
        params = GBMParams(mu=0.06, sigma=0.22)
        runner = MonteCarloRunner()
        paths = runner.run(
            "TEST", model, params, n_sims=20_000, horizon_days=63, start_price=100.0, seed=7
        )

        risk = RiskAnalyticsBuilder().build(paths, current_price=100.0)

        assert risk.expected_shortfall_95 >= risk.value_at_risk_95
        assert risk.drawdown.worst_case_drawdown <= risk.drawdown.mean_max_drawdown <= 0
        assert 0 <= risk.distribution.prob_positive_return <= 1
        assert risk.distribution.worst_5pct <= risk.distribution.best_5pct
