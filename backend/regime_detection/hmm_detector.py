from __future__ import annotations

from typing import cast

import pandas as pd
from hmmlearn.hmm import GaussianHMM
from sklearn.preprocessing import StandardScaler

from regime_detection.contracts import REGIME_FEATURE_COLUMNS, RegimeLabel, RegimeResult
from regime_detection.regime_labeling import (
    DEFAULT_THRESHOLDS,
    LabelingThresholds,
    aggregate_posterior_by_label,
    compute_state_stats,
    map_states_to_labels,
)


class HMMRegimeDetector:
    """Primary regime detector: a `hmmlearn.GaussianHMM` over rolling
    volatility/return/momentum features, with raw states mapped to semantic
    `RegimeLabel`s by `regime_labeling` (rule-based, not learned).
    """

    def __init__(
        self,
        ticker: str,
        n_states: int = 5,
        covariance_type: str = "full",
        random_state: int = 42,
        feature_columns: tuple[str, ...] = REGIME_FEATURE_COLUMNS,
        thresholds: LabelingThresholds = DEFAULT_THRESHOLDS,
    ) -> None:
        self.ticker = ticker
        self.n_states = n_states
        self.covariance_type = covariance_type
        self.random_state = random_state
        self.feature_columns = feature_columns
        self.thresholds = thresholds

        self._model: GaussianHMM | None = None
        self._scaler: StandardScaler | None = None
        self._state_labels: dict[int, RegimeLabel] | None = None

    @property
    def state_labels(self) -> dict[int, RegimeLabel]:
        if self._state_labels is None:
            raise RuntimeError("HMMRegimeDetector must be fit before accessing state_labels")
        return self._state_labels

    def fit(self, features: pd.DataFrame) -> HMMRegimeDetector:
        clean = features[list(self.feature_columns)].dropna()
        if len(clean) < self.n_states * 5:
            raise ValueError(
                f"Not enough history ({len(clean)} rows) to fit a {self.n_states}-state HMM"
            )

        self._scaler = StandardScaler().fit(clean.to_numpy())
        x = self._scaler.transform(clean.to_numpy())

        self._model = GaussianHMM(
            n_components=self.n_states,
            covariance_type=self.covariance_type,
            random_state=self.random_state,
            n_iter=200,
        )
        self._model.fit(x)

        state_assignments = self._model.predict(x)
        state_stats = compute_state_stats(clean, state_assignments)
        self._state_labels = map_states_to_labels(state_stats, self.thresholds)
        return self

    def predict(self, features: pd.DataFrame) -> RegimeResult:
        model, scaler, state_labels = self._require_fitted()
        clean = features[list(self.feature_columns)].dropna()
        x = scaler.transform(clean.to_numpy())

        posterior = model.predict_proba(x)
        states = model.predict(x)

        last_state = int(states[-1])
        last_posterior = posterior[-1]
        as_of = cast(pd.Timestamp, clean.index[-1]).date()

        posterior_by_label = aggregate_posterior_by_label(last_posterior, state_labels)
        label = state_labels[last_state]

        return RegimeResult(
            ticker=self.ticker,
            as_of=as_of,
            label=label,
            confidence=posterior_by_label[label],
            posterior=posterior_by_label,
            raw_state_id=last_state,
            method="hmm",
            n_states_fit=self.n_states,
        )

    def predict_proba(self, features: pd.DataFrame) -> pd.DataFrame:
        model, scaler, _ = self._require_fitted()
        clean = features[list(self.feature_columns)].dropna()
        x = scaler.transform(clean.to_numpy())
        posterior = model.predict_proba(x)
        columns = [f"state_{i}" for i in range(self.n_states)]
        return pd.DataFrame(posterior, index=clean.index, columns=columns)

    def _require_fitted(
        self,
    ) -> tuple[GaussianHMM, StandardScaler, dict[int, RegimeLabel]]:
        if self._model is None or self._scaler is None or self._state_labels is None:
            raise RuntimeError("HMMRegimeDetector must be fit before calling predict")
        return self._model, self._scaler, self._state_labels
