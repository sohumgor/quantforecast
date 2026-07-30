from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class DrawdownStats:
    mean_max_drawdown: float
    worst_case_drawdown: float  # e.g. 95th-percentile-worst simulated max drawdown


@dataclass(frozen=True)
class DistributionSummary:
    expected_return: float
    median_return: float
    ci_lower_90: float
    ci_upper_90: float
    prob_positive_return: float
    worst_5pct: float
    best_5pct: float


@dataclass(frozen=True)
class RiskAnalytics:
    value_at_risk_95: float
    expected_shortfall_95: float
    drawdown: DrawdownStats
    distribution: DistributionSummary
