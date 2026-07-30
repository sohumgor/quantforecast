from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from forecasting_models.registry import list_models
from model_selection.contracts import ModelScore, RecommendationResult
from model_selection.explanation_builder import build_explanation
from model_selection.lookup_table import PerformanceLookupTable
from regime_detection.contracts import RegimeResult


@dataclass(frozen=True)
class CompositeScoreWeights:
    """Weights for combining normalized backtest metrics into one ranking
    score (lower = better). Mirrored in `backend/config/defaults.yaml`."""

    crps: float = 0.4
    rmse: float = 0.3
    directional_accuracy: float = 0.2
    coverage_error: float = 0.1


DEFAULT_WEIGHTS = CompositeScoreWeights()


class ModelSelectionEngine:
    """Deterministic recommendation engine: given the current regime and a
    per-ticker (falling back to universal-prior) performance lookup table,
    ranks implemented forecasting models and returns a recommendation with
    a human-readable explanation and confidence scores.

    This engine never imports a concrete forecasting model or calls
    `simulation` — only `forecasting_models.registry` metadata and the
    lookup table, keeping regime detection and model selection composable.
    """

    def __init__(
        self,
        lookup: PerformanceLookupTable,
        fallback: PerformanceLookupTable,
        min_observations_threshold: int = 5,
        tie_epsilon: float = 0.02,
        weights: CompositeScoreWeights = DEFAULT_WEIGHTS,
    ) -> None:
        self._lookup = lookup
        self._fallback = fallback
        self._min_observations_threshold = min_observations_threshold
        self._tie_epsilon = tie_epsilon
        self._weights = weights

    def recommend(
        self, ticker: str, regime: RegimeResult, feature_summary: pd.Series | None = None
    ) -> RecommendationResult:
        rows, used_fallback = self._select_rows(regime)
        if rows.empty:
            raise ValueError(
                f"No backtest performance data available for regime '{regime.label.value}', "
                "even after falling back to the universal prior. Run a backtest to populate it."
            )

        rows = self._score(rows)
        best_score = float(rows.iloc[0]["composite_score"])
        tied_mask = rows["composite_score"] <= best_score + self._tie_epsilon
        recommended = rows.loc[tied_mask, "model_name"].tolist()

        score_span = max(
            float(rows["composite_score"].max() - rows["composite_score"].min()), 1e-9
        )
        ranked_models = [
            ModelScore(
                name=str(row["model_name"]),
                composite_score=float(row["composite_score"]),
                confidence=self._confidence(row, regime, best_score, score_span),
                n_observations=int(row["n_observations"]),
            )
            for _, row in rows.iterrows()
        ]

        explanation = build_explanation(regime, rows, used_fallback)

        return RecommendationResult(
            ticker=ticker,
            regime=regime,
            ranked_models=ranked_models,
            recommended=recommended,
            explanation=explanation,
            used_fallback=used_fallback,
        )

    def _select_rows(self, regime: RegimeResult) -> tuple[pd.DataFrame, bool]:
        implemented = {m.name for m in list_models(only_implemented=True)}

        rows = self._lookup.query(regime.label)
        rows = rows[rows["model_name"].isin(implemented)] if not rows.empty else rows
        if not rows.empty and rows["n_observations"].sum() >= self._min_observations_threshold:
            return rows.reset_index(drop=True), False

        fallback_rows = self._fallback.query(regime.label)
        fallback_rows = (
            fallback_rows[fallback_rows["model_name"].isin(implemented)]
            if not fallback_rows.empty
            else fallback_rows
        )
        if not fallback_rows.empty:
            return fallback_rows.reset_index(drop=True), True

        return rows.reset_index(drop=True), False

    def _score(self, rows: pd.DataFrame) -> pd.DataFrame:
        rows = rows.copy()
        norm_crps = _normalize(rows["mean_crps"])
        norm_rmse = _normalize(rows["mean_rmse"])
        coverage_error = (rows["coverage_90"] - 0.90).abs()

        rows["composite_score"] = (
            self._weights.crps * norm_crps
            + self._weights.rmse * norm_rmse
            + self._weights.directional_accuracy * (1 - rows["directional_accuracy"])
            + self._weights.coverage_error * coverage_error
        )
        return rows.sort_values("composite_score").reset_index(drop=True)

    def _confidence(
        self, row: pd.Series, regime: RegimeResult, best_score: float, score_span: float
    ) -> float:
        n_obs = row["n_observations"]
        data_sufficiency = min(1.0, n_obs / (self._min_observations_threshold * 2))
        gap = float(row["composite_score"]) - best_score
        gap_penalty = min(1.0, gap / score_span)
        return float(regime.confidence * data_sufficiency * (1 - gap_penalty))


def _normalize(series: pd.Series) -> pd.Series:
    lo, hi = series.min(), series.max()
    if hi - lo < 1e-12:
        return pd.Series(0.0, index=series.index)
    return (series - lo) / (hi - lo)
