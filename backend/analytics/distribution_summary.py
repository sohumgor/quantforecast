from __future__ import annotations

import numpy as np

from analytics.metrics_contracts import DistributionSummary, RiskAnalytics
from analytics.risk_metrics import expected_shortfall, max_drawdown_distribution, value_at_risk
from simulation.path_result import SimulationPaths


def summarize_distribution(terminal_returns: np.ndarray) -> DistributionSummary:
    """Summarizes the terminal return distribution: central tendency, a 90%
    confidence interval, probability of a positive outcome, and the average
    return conditional on landing in the worst/best 5% of outcomes (not just
    where those tails begin — that's what the CI bounds already show).
    """
    lower_bound = np.quantile(terminal_returns, 0.05)
    upper_bound = np.quantile(terminal_returns, 0.95)
    worst_tail = terminal_returns[terminal_returns <= lower_bound]
    best_tail = terminal_returns[terminal_returns >= upper_bound]

    return DistributionSummary(
        expected_return=float(terminal_returns.mean()),
        median_return=float(np.median(terminal_returns)),
        ci_lower_90=float(lower_bound),
        ci_upper_90=float(upper_bound),
        prob_positive_return=float((terminal_returns > 0).mean()),
        worst_5pct=float(worst_tail.mean()) if len(worst_tail) else float(lower_bound),
        best_5pct=float(best_tail.mean()) if len(best_tail) else float(upper_bound),
    )


class RiskAnalyticsBuilder:
    """Turns `SimulationPaths` into the full `RiskAnalytics` bundle (VaR, ES,
    drawdown distribution, distribution summary), all expressed in return
    (not price) terms relative to `current_price`.
    """

    def build(self, paths: SimulationPaths, current_price: float) -> RiskAnalytics:
        terminal_returns = paths.terminal_values / current_price - 1.0

        return RiskAnalytics(
            value_at_risk_95=value_at_risk(terminal_returns, alpha=0.05),
            expected_shortfall_95=expected_shortfall(terminal_returns, alpha=0.05),
            drawdown=max_drawdown_distribution(paths.paths, start_price=current_price),
            distribution=summarize_distribution(terminal_returns),
        )
