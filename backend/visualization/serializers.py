from __future__ import annotations

import numpy as np
import pandas as pd

from regime_detection.regime_timeline import RegimeTimeline
from simulation.path_result import SimulationPaths
from visualization.chart_payloads import (
    DensityPayload,
    FanChartPayload,
    ModelHeatmapPayload,
    RegimeTimelinePayload,
)

DEFAULT_FAN_PERCENTILES: tuple[float, ...] = (5, 25, 50, 75, 95)


def serialize_fan_chart(
    paths: SimulationPaths, percentiles: tuple[float, ...] = DEFAULT_FAN_PERCENTILES
) -> FanChartPayload:
    """Converts simulated paths into JSON-safe percentile-band traces for a
    Plotly fan chart. Serialization only — no server-side chart rendering or
    styling, which stays entirely frontend-owned.
    """
    horizon_days = list(range(1, paths.paths.shape[1] + 1))
    percentile_values = np.percentile(paths.paths, percentiles, axis=0)
    percentile_bands = {
        f"p{p:g}": percentile_values[i].tolist() for i, p in enumerate(percentiles)
    }
    return FanChartPayload(horizon_days=horizon_days, percentiles=percentile_bands)


def serialize_density(paths: SimulationPaths, n_bins: int = 50) -> DensityPayload:
    counts, bin_edges = np.histogram(paths.terminal_values, bins=n_bins)
    return DensityPayload(bin_edges=bin_edges.tolist(), counts=counts.tolist())


def serialize_model_heatmap(rankings: list[dict[str, float]]) -> ModelHeatmapPayload:
    raise NotImplementedError("serialize_model_heatmap lands in Phase 9")


def serialize_regime_timeline(timeline: RegimeTimeline) -> RegimeTimelinePayload:
    frame = timeline.frame
    dates = [str(pd.Timestamp(idx).date()) for idx in frame.index]
    return RegimeTimelinePayload(
        dates=dates,
        labels=frame["label"].tolist(),
        confidence=frame["confidence"].tolist(),
    )
