from __future__ import annotations

import pandas as pd

from forecasting_models.registry import get_model
from model_selection.contracts import Explanation
from regime_detection.contracts import RegimeLabel, RegimeResult

REGIME_DESCRIPTIONS: dict[RegimeLabel, str] = {
    RegimeLabel.LOW_VOL: "Low volatility — prices have been calm and stable recently.",
    RegimeLabel.MEDIUM_VOL: "Medium volatility — typical day-to-day price fluctuation.",
    RegimeLabel.HIGH_VOL: "High volatility — prices have been swinging significantly.",
    RegimeLabel.HIGH_VOL_JUMPS: (
        "High volatility with jumps — large sudden price moves have been occurring."
    ),
    RegimeLabel.TRENDING: "Trending — the price has shown a sustained directional move.",
    RegimeLabel.SIDEWAYS: "Sideways — the price has been range-bound with no clear direction.",
    RegimeLabel.STRESS_CRISIS: (
        "Stress/crisis — severe declines and elevated volatility, consistent with market stress."
    ),
}


def build_explanation(
    regime: RegimeResult, ranked_rows: pd.DataFrame, used_fallback: bool
) -> Explanation:
    """Builds the human-readable rationale bundled with every `RecommendationResult`.

    `ranked_rows` must already be sorted best-first (lowest `composite_score`
    first) and contain a `composite_score` column, as produced by
    `ModelSelectionEngine.recommend`.
    """
    top = ranked_rows.iloc[0]
    top_display_name = get_model(top["model_name"]).metadata.display_name
    regime_label_text = regime.label.value.replace("_", " ")

    performance_basis = (
        f"based on a universal prior across a basket of tickers "
        f"({int(top['n_observations'])} backtest windows in this regime)"
        if used_fallback
        else (
            f"based on {int(top['n_observations'])} backtest windows for {regime.ticker} "
            f"in this regime"
        )
    )

    summary = (
        f"In {regime_label_text} regimes, {top_display_name} has historically had the best "
        f"combination of forecast accuracy (CRPS), error (RMSE), directional accuracy, and "
        f"interval calibration among the implemented models, {performance_basis}."
    )

    regime_description = REGIME_DESCRIPTIONS.get(regime.label, regime_label_text)
    regime_confidence_note = (
        f"Regime classification confidence: {regime.confidence:.0%} "
        f"(posterior probability assigned to {regime_label_text})."
    )

    driving_features = [
        f"mean CRPS {top['mean_crps']:.4g}",
        f"directional accuracy {top['directional_accuracy']:.0%}",
        f"90% interval coverage {top['coverage_90']:.0%} (target 90%)",
    ]

    return Explanation(
        summary=summary,
        regime_description=regime_description,
        regime_confidence_note=regime_confidence_note,
        performance_basis=performance_basis,
        driving_features=driving_features,
    )
