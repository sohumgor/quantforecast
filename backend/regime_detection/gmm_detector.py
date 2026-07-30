from __future__ import annotations

from typing import cast

import pandas as pd
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler

from regime_detection.contracts import REGIME_FEATURE_COLUMNS, RegimeLabel, RegimeResult
from regime_detection.regime_labeling import (
    DEFAULT_THRESHOLDS,
    LabelingThresholds,
    aggregate_posterior_by_label,
    compute_state_stats,
    map_states_to_labels,
)


class GMMRegimeDetector:
    """Secondary regime detector for comparison: `sklearn.mixture.GaussianMixture`
    over the same feature columns as `HMMRegimeDetector`, without time-dependence
    (an i.i.d. mixture rather than a Markov chain). Surfaced only in Advanced
    Mode via `comparator.py` — never affects model selection.
    """

    def __init__(
        self,
        ticker: str,
        n_components: int = 5,
        random_state: int = 42,
        feature_columns: tuple[str, ...] = REGIME_FEATURE_COLUMNS,
        thresholds: LabelingThresholds = DEFAULT_THRESHOLDS,
    ) -> None:
        self.ticker = ticker
        self.n_components = n_components
        self.random_state = random_state
        self.feature_columns = feature_columns
        self.thresholds = thresholds

        self._model: GaussianMixture | None = None
        self._scaler: StandardScaler | None = None
        self._state_labels: dict[int, RegimeLabel] | None = None

    @property
    def state_labels(self) -> dict[int, RegimeLabel]:
        if self._state_labels is None:
            raise RuntimeError("GMMRegimeDetector must be fit before accessing state_labels")
        return self._state_labels

    def fit(self, features: pd.DataFrame) -> GMMRegimeDetector:
        clean = features[list(self.feature_columns)].dropna()
        if len(clean) < self.n_components * 5:
            raise ValueError(
                f"Not enough history ({len(clean)} rows) to fit a {self.n_components}-component GMM"
            )

        self._scaler = StandardScaler().fit(clean.to_numpy())
        x = self._scaler.transform(clean.to_numpy())

        self._model = GaussianMixture(
            n_components=self.n_components, random_state=self.random_state
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
            method="gmm",
            n_states_fit=self.n_components,
        )

    def predict_proba(self, features: pd.DataFrame) -> pd.DataFrame:
        model, scaler, _ = self._require_fitted()
        clean = features[list(self.feature_columns)].dropna()
        x = scaler.transform(clean.to_numpy())
        posterior = model.predict_proba(x)
        columns = [f"state_{i}" for i in range(self.n_components)]
        return pd.DataFrame(posterior, index=clean.index, columns=columns)

    def _require_fitted(
        self,
    ) -> tuple[GaussianMixture, StandardScaler, dict[int, RegimeLabel]]:
        if self._model is None or self._scaler is None or self._state_labels is None:
            raise RuntimeError("GMMRegimeDetector must be fit before calling predict")
        return self._model, self._scaler, self._state_labels
