from __future__ import annotations

from dataclasses import dataclass, field

from regime_detection.contracts import RegimeResult


@dataclass(frozen=True)
class ModelScore:
    name: str
    composite_score: float
    confidence: float
    n_observations: int


@dataclass(frozen=True)
class Explanation:
    summary: str  # e.g. "In High Volatility regimes, GARCH(1,1) has had lower error historically."
    regime_description: str
    regime_confidence_note: str
    performance_basis: str  # e.g. "based on 14 backtest windows for AAPL" or "universal prior"
    driving_features: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class RecommendationResult:
    ticker: str
    regime: RegimeResult
    ranked_models: list[ModelScore]
    recommended: list[str]  # >1 entry only when models are within the tie epsilon
    explanation: Explanation
    used_fallback: bool  # True if the universal prior was used (cold start)
