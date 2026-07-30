from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class FanChartPayload:
    """Percentile bands over the forecast horizon, ready for a Plotly fan chart."""

    horizon_days: list[int]
    percentiles: dict[str, list[float]] = field(default_factory=dict)  # e.g. "p5" -> values


@dataclass(frozen=True)
class DensityPayload:
    bin_edges: list[float]
    counts: list[float]


@dataclass(frozen=True)
class RegimeTimelinePayload:
    dates: list[str]
    labels: list[str]
    confidence: list[float]


@dataclass(frozen=True)
class ModelHeatmapPayload:
    models: list[str]
    regimes: list[str]
    scores: list[list[float]]
