from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from regime_detection.contracts import RegimeLabel


@dataclass(frozen=True)
class StateStats:
    """Per-state summary statistics computed from the original (unscaled)
    feature values assigned to that state — the input to deterministic
    label mapping."""

    mean_vol: float
    mean_momentum: float
    mean_drawdown: float
    mean_kurtosis: float


@dataclass(frozen=True)
class LabelingThresholds:
    """Tunable cutoffs driving the rule-based state→label mapping."""

    stress_drawdown: float = -0.15
    jump_kurtosis: float = 3.0
    trend_momentum: float = 0.02
    sideways_momentum: float = 0.01


DEFAULT_THRESHOLDS = LabelingThresholds()


def compute_state_stats(
    features: pd.DataFrame, state_assignments: np.ndarray
) -> dict[int, StateStats]:
    """Per-state means of volatility/momentum/drawdown/kurtosis, computed from
    the original (unscaled) feature values — used to deterministically map
    raw HMM/GMM state IDs to semantic `RegimeLabel`s."""
    stats: dict[int, StateStats] = {}
    for state in np.unique(state_assignments):
        subset = features.loc[state_assignments == state]
        stats[int(state)] = StateStats(
            mean_vol=float(subset["rolling_vol_21d"].mean()),
            mean_momentum=float(subset["momentum_10d"].mean()),
            mean_drawdown=float(subset["drawdown"].mean()),
            mean_kurtosis=float(subset["rolling_kurtosis_63d"].mean()),
        )
    return stats


def map_states_to_labels(
    state_stats: dict[int, StateStats],
    thresholds: LabelingThresholds = DEFAULT_THRESHOLDS,
) -> dict[int, RegimeLabel]:
    """Deterministically ranks states by volatility, then assigns semantic
    labels via rule-based thresholds on drawdown severity (stress/crisis),
    tail risk (jumps), and trend strength (trending vs. sideways). This
    mapping is rule-based, not learned — auditable by design, unlike the
    unsupervised state discovery itself.
    """
    ranked = sorted(state_stats.items(), key=lambda kv: kv[1].mean_vol)
    labels: dict[int, RegimeLabel] = {}

    lowest_state, _ = ranked[0]
    labels[lowest_state] = RegimeLabel.LOW_VOL

    highest_state, highest_stats = ranked[-1]
    if highest_stats.mean_drawdown <= thresholds.stress_drawdown:
        labels[highest_state] = RegimeLabel.STRESS_CRISIS
    elif highest_stats.mean_kurtosis >= thresholds.jump_kurtosis:
        labels[highest_state] = RegimeLabel.HIGH_VOL_JUMPS
    else:
        labels[highest_state] = RegimeLabel.HIGH_VOL

    for state, stats in ranked[1:-1]:
        momentum = abs(stats.mean_momentum)
        if momentum >= thresholds.trend_momentum:
            labels[state] = RegimeLabel.TRENDING
        elif momentum < thresholds.sideways_momentum:
            labels[state] = RegimeLabel.SIDEWAYS
        else:
            labels[state] = RegimeLabel.MEDIUM_VOL

    return labels


def aggregate_posterior_by_label(
    state_posterior: np.ndarray, state_labels: dict[int, RegimeLabel]
) -> dict[RegimeLabel, float]:
    """Sums posterior probability across raw states that share the same label,
    turning a per-state posterior into a proper distribution over regimes."""
    by_label: dict[RegimeLabel, float] = {}
    for state_id, prob in enumerate(state_posterior):
        label = state_labels.get(state_id)
        if label is None:
            continue
        by_label[label] = by_label.get(label, 0.0) + float(prob)
    return by_label
