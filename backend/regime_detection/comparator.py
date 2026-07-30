from __future__ import annotations

import pandas as pd
from sklearn.metrics import cohen_kappa_score


def hmm_gmm_agreement(hmm_labels: pd.Series, gmm_labels: pd.Series) -> dict[str, float]:
    """Advanced-Mode-only diagnostic: agreement between HMM and GMM regime labels
    over history. Never affects the model recommendation.
    """
    aligned = pd.concat([hmm_labels, gmm_labels], axis=1, join="inner").dropna()
    aligned.columns = pd.Index(["hmm", "gmm"])
    if aligned.empty:
        return {"agreement_rate": float("nan"), "cohen_kappa": float("nan")}

    agreement_rate = float((aligned["hmm"] == aligned["gmm"]).mean())
    kappa = float(cohen_kappa_score(aligned["hmm"], aligned["gmm"]))
    return {"agreement_rate": agreement_rate, "cohen_kappa": kappa}
