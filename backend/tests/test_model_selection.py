from __future__ import annotations

from datetime import date
from pathlib import Path

import pandas as pd
import pytest

from model_selection.explanation_builder import build_explanation
from model_selection.lookup_table import PerformanceLookupTable
from model_selection.selector import CompositeScoreWeights, ModelSelectionEngine
from regime_detection.contracts import RegimeLabel, RegimeResult


def _row(
    model_name: str,
    n_observations: int = 20,
    mean_mae: float = 1.0,
    mean_rmse: float = 1.5,
    mean_crps: float = 0.8,
    coverage_90: float = 0.90,
    directional_accuracy: float = 0.55,
    regime: str = "low_vol",
) -> dict[str, object]:
    return {
        "regime": regime,
        "model_name": model_name,
        "n_observations": n_observations,
        "mean_mae": mean_mae,
        "mean_rmse": mean_rmse,
        "mean_crps": mean_crps,
        "coverage_90": coverage_90,
        "coverage_95": min(coverage_90 + 0.05, 1.0),
        "directional_accuracy": directional_accuracy,
        "mean_var_violations": 0.05,
        "mean_es_95": 0.1,
        "last_updated": "2024-01-01",
        "source": "ticker_backtest",
    }


def _regime(
    label: RegimeLabel = RegimeLabel.LOW_VOL, confidence: float = 0.9, ticker: str = "AAPL"
) -> RegimeResult:
    return RegimeResult(
        ticker=ticker,
        as_of=date(2024, 1, 1),
        label=label,
        confidence=confidence,
        posterior={label: confidence},
        raw_state_id=0,
        method="hmm",
        n_states_fit=5,
    )


@pytest.fixture
def engine_with_data(tmp_path: Path) -> ModelSelectionEngine:
    lookup = PerformanceLookupTable(tmp_path / "per_ticker.parquet")
    fallback = PerformanceLookupTable(tmp_path / "universal.parquet")
    lookup.upsert(
        pd.DataFrame(
            [
                _row("gbm", mean_crps=0.8, mean_rmse=1.5, directional_accuracy=0.55),
                _row("garch11", mean_crps=1.5, mean_rmse=2.5, directional_accuracy=0.50),
                _row(
                    "historical_bootstrap",
                    mean_crps=0.805,
                    mean_rmse=1.51,
                    directional_accuracy=0.55,
                ),
            ]
        )
    )
    return ModelSelectionEngine(lookup, fallback)


class TestModelSelectionEngine:
    def test_best_model_ranked_first(self, engine_with_data: ModelSelectionEngine) -> None:
        result = engine_with_data.recommend("AAPL", _regime())
        assert result.ranked_models[0].name == "gbm"
        assert result.ranked_models[0].composite_score <= result.ranked_models[1].composite_score
        assert not result.used_fallback

    def test_near_identical_models_are_tied(self, engine_with_data: ModelSelectionEngine) -> None:
        result = engine_with_data.recommend("AAPL", _regime())
        # gbm and historical_bootstrap were given near-identical metrics
        assert set(result.recommended) >= {"gbm", "historical_bootstrap"}
        assert "garch11" not in result.recommended

    def test_confidence_in_valid_range(self, engine_with_data: ModelSelectionEngine) -> None:
        result = engine_with_data.recommend("AAPL", _regime())
        for m in result.ranked_models:
            assert 0.0 <= m.confidence <= 1.0

    def test_more_observations_increase_confidence_all_else_equal(self, tmp_path: Path) -> None:
        lookup = PerformanceLookupTable(tmp_path / "per_ticker.parquet")
        fallback = PerformanceLookupTable(tmp_path / "universal.parquet")
        # Identical performance metrics, differing only in n_observations, so
        # composite_score ties and confidence differences come purely from
        # the data-sufficiency term.
        lookup.upsert(
            pd.DataFrame(
                [
                    _row("gbm", n_observations=3, mean_crps=1.0, mean_rmse=1.5),
                    _row("garch11", n_observations=50, mean_crps=1.0, mean_rmse=1.5),
                ]
            )
        )
        engine = ModelSelectionEngine(lookup, fallback, min_observations_threshold=5)
        result = engine.recommend("AAPL", _regime())
        by_name = {m.name: m for m in result.ranked_models}
        assert by_name["garch11"].confidence > by_name["gbm"].confidence

    def test_cold_start_falls_back_to_universal_prior(self, tmp_path: Path) -> None:
        # lookup stays empty: no per-ticker data
        lookup = PerformanceLookupTable(tmp_path / "per_ticker.parquet")
        fallback = PerformanceLookupTable(tmp_path / "universal.parquet")
        fallback.upsert(pd.DataFrame([_row("gbm", regime="stress_crisis", n_observations=100)]))

        engine = ModelSelectionEngine(lookup, fallback)
        result = engine.recommend("AAPL", _regime(label=RegimeLabel.STRESS_CRISIS))

        assert result.used_fallback is True
        assert result.recommended == ["gbm"]

    def test_below_min_observations_threshold_falls_back(self, tmp_path: Path) -> None:
        lookup = PerformanceLookupTable(tmp_path / "per_ticker.parquet")
        fallback = PerformanceLookupTable(tmp_path / "universal.parquet")
        lookup.upsert(pd.DataFrame([_row("gbm", n_observations=2)]))  # below threshold
        fallback.upsert(pd.DataFrame([_row("gbm", n_observations=100)]))

        engine = ModelSelectionEngine(lookup, fallback, min_observations_threshold=5)
        result = engine.recommend("AAPL", _regime())

        assert result.used_fallback is True

    def test_raises_when_no_data_anywhere(self, tmp_path: Path) -> None:
        lookup = PerformanceLookupTable(tmp_path / "per_ticker.parquet")
        fallback = PerformanceLookupTable(tmp_path / "universal.parquet")
        engine = ModelSelectionEngine(lookup, fallback)

        with pytest.raises(ValueError, match="No backtest performance data"):
            engine.recommend("AAPL", _regime())

    def test_only_implemented_models_are_recommended(self, tmp_path: Path) -> None:
        lookup = PerformanceLookupTable(tmp_path / "per_ticker.parquet")
        fallback = PerformanceLookupTable(tmp_path / "universal.parquet")
        lookup.upsert(
            pd.DataFrame(
                [
                    _row("gbm", mean_crps=2.0),
                    _row("heston", mean_crps=0.1),  # best score, but not implemented
                ]
            )
        )
        engine = ModelSelectionEngine(lookup, fallback)
        result = engine.recommend("AAPL", _regime())
        assert all(m.name != "heston" for m in result.ranked_models)


class TestCompositeScoreWeights:
    def test_custom_weights_change_ranking(self, tmp_path: Path) -> None:
        lookup = PerformanceLookupTable(tmp_path / "per_ticker.parquet")
        fallback = PerformanceLookupTable(tmp_path / "universal.parquet")
        lookup.upsert(
            pd.DataFrame(
                [
                    # model A: great CRPS, terrible directional accuracy
                    _row("gbm", mean_crps=0.1, mean_rmse=0.1, directional_accuracy=0.30),
                    # model B: mediocre CRPS, great directional accuracy
                    _row("garch11", mean_crps=1.0, mean_rmse=1.0, directional_accuracy=0.90),
                ]
            )
        )
        crps_weights = CompositeScoreWeights(
            crps=1.0, rmse=0, directional_accuracy=0, coverage_error=0
        )
        direction_weights = CompositeScoreWeights(
            crps=0, rmse=0, directional_accuracy=1.0, coverage_error=0
        )
        crps_focused = ModelSelectionEngine(lookup, fallback, weights=crps_weights)
        direction_focused = ModelSelectionEngine(lookup, fallback, weights=direction_weights)

        assert crps_focused.recommend("AAPL", _regime()).ranked_models[0].name == "gbm"
        assert direction_focused.recommend("AAPL", _regime()).ranked_models[0].name == "garch11"


class TestBuildExplanation:
    def test_explanation_mentions_regime_and_model(self) -> None:
        rows = pd.DataFrame(
            [
                {
                    "model_name": "gbm",
                    "n_observations": 15,
                    "mean_crps": 0.8,
                    "directional_accuracy": 0.6,
                    "coverage_90": 0.9,
                    "composite_score": 0.1,
                }
            ]
        )
        regime = _regime(label=RegimeLabel.TRENDING)
        explanation = build_explanation(regime, rows, used_fallback=False)
        assert "trending" in explanation.summary.lower()
        assert "Geometric Brownian Motion" in explanation.summary
        assert "15 backtest windows" in explanation.performance_basis
        assert len(explanation.driving_features) == 3
