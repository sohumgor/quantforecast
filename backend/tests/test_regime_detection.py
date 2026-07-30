from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from data_ingestion.schemas import PriceSeries
from feature_engineering.pipeline import FeatureEngineeringPipeline
from regime_detection.comparator import hmm_gmm_agreement
from regime_detection.contracts import RegimeLabel
from regime_detection.gmm_detector import GMMRegimeDetector
from regime_detection.hmm_detector import HMMRegimeDetector
from regime_detection.regime_labeling import (
    LabelingThresholds,
    StateStats,
    aggregate_posterior_by_label,
    compute_state_stats,
    map_states_to_labels,
)
from regime_detection.regime_timeline import RegimeTimelineBuilder

THRESHOLDS = LabelingThresholds()


def _stats(
    mean_vol: float, mean_momentum: float, mean_drawdown: float, mean_kurtosis: float
) -> StateStats:
    return StateStats(
        mean_vol=mean_vol,
        mean_momentum=mean_momentum,
        mean_drawdown=mean_drawdown,
        mean_kurtosis=mean_kurtosis,
    )


class TestMapStatesToLabels:
    def test_lowest_vol_state_is_always_low_vol(self) -> None:
        stats = {
            0: _stats(mean_vol=0.05, mean_momentum=0.0, mean_drawdown=-0.01, mean_kurtosis=0.5),
            1: _stats(mean_vol=0.40, mean_momentum=0.0, mean_drawdown=-0.20, mean_kurtosis=1.0),
        }
        labels = map_states_to_labels(stats, THRESHOLDS)
        assert labels[0] == RegimeLabel.LOW_VOL

    def test_highest_vol_with_severe_drawdown_is_stress_crisis(self) -> None:
        stats = {
            0: _stats(mean_vol=0.05, mean_momentum=0.0, mean_drawdown=-0.01, mean_kurtosis=0.5),
            1: _stats(mean_vol=0.50, mean_momentum=-0.01, mean_drawdown=-0.25, mean_kurtosis=1.0),
        }
        labels = map_states_to_labels(stats, THRESHOLDS)
        assert labels[1] == RegimeLabel.STRESS_CRISIS

    def test_highest_vol_with_high_kurtosis_but_mild_drawdown_is_jumps(self) -> None:
        stats = {
            0: _stats(mean_vol=0.05, mean_momentum=0.0, mean_drawdown=-0.01, mean_kurtosis=0.5),
            1: _stats(mean_vol=0.50, mean_momentum=0.0, mean_drawdown=-0.05, mean_kurtosis=5.0),
        }
        labels = map_states_to_labels(stats, THRESHOLDS)
        assert labels[1] == RegimeLabel.HIGH_VOL_JUMPS

    def test_highest_vol_plain_is_high_vol(self) -> None:
        stats = {
            0: _stats(mean_vol=0.05, mean_momentum=0.0, mean_drawdown=-0.01, mean_kurtosis=0.5),
            1: _stats(mean_vol=0.50, mean_momentum=0.0, mean_drawdown=-0.05, mean_kurtosis=1.0),
        }
        labels = map_states_to_labels(stats, THRESHOLDS)
        assert labels[1] == RegimeLabel.HIGH_VOL

    def test_middle_state_high_momentum_is_trending(self) -> None:
        stats = {
            0: _stats(mean_vol=0.05, mean_momentum=0.0, mean_drawdown=-0.01, mean_kurtosis=0.5),
            1: _stats(mean_vol=0.15, mean_momentum=0.05, mean_drawdown=-0.03, mean_kurtosis=0.5),
            2: _stats(mean_vol=0.50, mean_momentum=0.0, mean_drawdown=-0.05, mean_kurtosis=1.0),
        }
        labels = map_states_to_labels(stats, THRESHOLDS)
        assert labels[1] == RegimeLabel.TRENDING

    def test_middle_state_low_momentum_is_sideways(self) -> None:
        stats = {
            0: _stats(mean_vol=0.05, mean_momentum=0.0, mean_drawdown=-0.01, mean_kurtosis=0.5),
            1: _stats(mean_vol=0.15, mean_momentum=0.001, mean_drawdown=-0.03, mean_kurtosis=0.5),
            2: _stats(mean_vol=0.50, mean_momentum=0.0, mean_drawdown=-0.05, mean_kurtosis=1.0),
        }
        labels = map_states_to_labels(stats, THRESHOLDS)
        assert labels[1] == RegimeLabel.SIDEWAYS

    def test_middle_state_moderate_momentum_is_medium_vol(self) -> None:
        stats = {
            0: _stats(mean_vol=0.05, mean_momentum=0.0, mean_drawdown=-0.01, mean_kurtosis=0.5),
            1: _stats(mean_vol=0.15, mean_momentum=0.015, mean_drawdown=-0.03, mean_kurtosis=0.5),
            2: _stats(mean_vol=0.50, mean_momentum=0.0, mean_drawdown=-0.05, mean_kurtosis=1.0),
        }
        labels = map_states_to_labels(stats, THRESHOLDS)
        assert labels[1] == RegimeLabel.MEDIUM_VOL


class TestComputeStateStats:
    def test_means_match_hand_computation(self) -> None:
        features = pd.DataFrame(
            {
                "rolling_vol_21d": [0.1, 0.1, 0.5, 0.5],
                "momentum_10d": [0.01, 0.03, -0.02, -0.04],
                "drawdown": [-0.01, -0.02, -0.10, -0.20],
                "rolling_kurtosis_63d": [0.5, 0.7, 2.0, 3.0],
            }
        )
        assignments = np.array([0, 0, 1, 1])
        stats = compute_state_stats(features, assignments)

        assert stats[0].mean_vol == pytest.approx(0.1)
        assert stats[0].mean_momentum == pytest.approx(0.02)
        assert stats[1].mean_drawdown == pytest.approx(-0.15)
        assert stats[1].mean_kurtosis == pytest.approx(2.5)


class TestAggregatePosteriorByLabel:
    def test_sums_probabilities_across_shared_label(self) -> None:
        state_labels = {0: RegimeLabel.LOW_VOL, 1: RegimeLabel.LOW_VOL, 2: RegimeLabel.HIGH_VOL}
        posterior = np.array([0.3, 0.2, 0.5])
        result = aggregate_posterior_by_label(posterior, state_labels)
        assert result[RegimeLabel.LOW_VOL] == pytest.approx(0.5)
        assert result[RegimeLabel.HIGH_VOL] == pytest.approx(0.5)


class TestHMMRegimeDetector:
    def test_fit_raises_with_insufficient_history(self) -> None:
        tiny = pd.DataFrame(
            {
                "log_return": [0.01, -0.01],
                "rolling_vol_21d": [0.1, 0.1],
                "momentum_10d": [0.0, 0.0],
                "drawdown": [0.0, 0.0],
                "rolling_skew_63d": [0.0, 0.0],
                "rolling_kurtosis_63d": [0.0, 0.0],
            }
        )
        detector = HMMRegimeDetector(ticker="TEST", n_states=5)
        with pytest.raises(ValueError, match="Not enough history"):
            detector.fit(tiny)

    def test_predict_proba_rows_sum_to_one(
        self, synthetic_two_regime_prices: tuple[PriceSeries, int]
    ) -> None:
        prices, _ = synthetic_two_regime_prices
        fs = FeatureEngineeringPipeline().transform(prices)
        detector = HMMRegimeDetector(ticker="TWOREGIME", n_states=2)
        detector.fit(fs.frame)
        proba = detector.predict_proba(fs.frame)
        assert np.allclose(proba.sum(axis=1), 1.0, atol=1e-6)

    def test_predict_confidence_is_a_valid_probability(
        self, synthetic_two_regime_prices: tuple[PriceSeries, int]
    ) -> None:
        prices, _ = synthetic_two_regime_prices
        fs = FeatureEngineeringPipeline().transform(prices)
        detector = HMMRegimeDetector(ticker="TWOREGIME", n_states=2)
        detector.fit(fs.frame)
        result = detector.predict(fs.frame)
        assert 0.0 <= result.confidence <= 1.0
        assert result.ticker == "TWOREGIME"
        assert result.method == "hmm"
        assert sum(result.posterior.values()) == pytest.approx(1.0, abs=1e-6)

    def test_distinguishes_calm_from_crisis_segment(
        self, synthetic_two_regime_prices: tuple[PriceSeries, int]
    ) -> None:
        prices, n_calm = synthetic_two_regime_prices
        crisis_start = prices.bars.index[n_calm]
        fs = FeatureEngineeringPipeline().transform(prices)

        detector = HMMRegimeDetector(ticker="TWOREGIME", n_states=2)
        detector.fit(fs.frame)
        proba = detector.predict_proba(fs.frame)
        raw_states = proba.to_numpy().argmax(axis=1)
        labels = pd.Series([detector.state_labels[s] for s in raw_states], index=proba.index)

        calm_majority = labels[labels.index < crisis_start].mode().iloc[0]
        crisis_majority = labels[labels.index >= crisis_start].mode().iloc[0]

        assert calm_majority == RegimeLabel.LOW_VOL
        assert calm_majority != crisis_majority


class TestGMMRegimeDetector:
    def test_predict_proba_rows_sum_to_one(
        self, synthetic_two_regime_prices: tuple[PriceSeries, int]
    ) -> None:
        prices, _ = synthetic_two_regime_prices
        fs = FeatureEngineeringPipeline().transform(prices)
        detector = GMMRegimeDetector(ticker="TWOREGIME", n_components=2)
        detector.fit(fs.frame)
        proba = detector.predict_proba(fs.frame)
        assert np.allclose(proba.sum(axis=1), 1.0, atol=1e-6)

    def test_distinguishes_calm_from_crisis_segment(
        self, synthetic_two_regime_prices: tuple[PriceSeries, int]
    ) -> None:
        prices, n_calm = synthetic_two_regime_prices
        crisis_start = prices.bars.index[n_calm]
        fs = FeatureEngineeringPipeline().transform(prices)

        detector = GMMRegimeDetector(ticker="TWOREGIME", n_components=2)
        detector.fit(fs.frame)
        proba = detector.predict_proba(fs.frame)
        raw_states = proba.to_numpy().argmax(axis=1)
        labels = pd.Series([detector.state_labels[s] for s in raw_states], index=proba.index)

        calm_majority = labels[labels.index < crisis_start].mode().iloc[0]
        crisis_majority = labels[labels.index >= crisis_start].mode().iloc[0]

        assert calm_majority == RegimeLabel.LOW_VOL
        assert calm_majority != crisis_majority


class TestRegimeTimelineBuilder:
    def test_build_produces_expected_columns(
        self, synthetic_two_regime_prices: tuple[PriceSeries, int]
    ) -> None:
        prices, _ = synthetic_two_regime_prices
        fs = FeatureEngineeringPipeline().transform(prices)
        detector = HMMRegimeDetector(ticker="TWOREGIME", n_states=2)

        timeline = RegimeTimelineBuilder().build("TWOREGIME", fs.frame, detector)

        assert timeline.ticker == "TWOREGIME"
        assert {"label", "confidence", "raw_state_id"}.issubset(timeline.frame.columns)
        assert any(col.startswith("posterior_") for col in timeline.frame.columns)
        assert len(timeline.frame) > 0

    def test_persist_and_load_roundtrip(
        self, synthetic_two_regime_prices: tuple[PriceSeries, int], tmp_path: Path
    ) -> None:
        prices, _ = synthetic_two_regime_prices
        fs = FeatureEngineeringPipeline().transform(prices)
        detector = HMMRegimeDetector(ticker="TWOREGIME", n_states=2)
        builder = RegimeTimelineBuilder()

        timeline = builder.build("TWOREGIME", fs.frame, detector)
        path = tmp_path / "TWOREGIME.parquet"
        builder.persist(timeline, path)

        assert path.exists()
        loaded = builder.load("TWOREGIME", path)
        assert len(loaded.frame) == len(timeline.frame)
        assert list(loaded.frame.columns) == list(timeline.frame.columns)


class TestHmmGmmAgreement:
    def test_identical_labels_have_full_agreement(self) -> None:
        idx = pd.date_range("2024-01-01", periods=10, freq="B")
        labels = pd.Series(["low_vol"] * 5 + ["high_vol"] * 5, index=idx)
        result = hmm_gmm_agreement(labels, labels)
        assert result["agreement_rate"] == pytest.approx(1.0)
        assert result["cohen_kappa"] == pytest.approx(1.0)

    def test_disagreement_lowers_agreement_rate(self) -> None:
        idx = pd.date_range("2024-01-01", periods=10, freq="B")
        hmm_labels = pd.Series(["low_vol"] * 5 + ["high_vol"] * 5, index=idx)
        gmm_labels = pd.Series(["low_vol"] * 3 + ["high_vol"] * 7, index=idx)
        result = hmm_gmm_agreement(hmm_labels, gmm_labels)
        assert result["agreement_rate"] == pytest.approx(0.8)
