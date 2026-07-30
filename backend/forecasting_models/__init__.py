"""Importing this package registers every forecasting model into MODEL_REGISTRY."""

from forecasting_models import (
    egarch,
    garch,
    gbm,
    heston,
    historical_bootstrap,
    jump_diffusion,
    regime_switching,
)
from forecasting_models.base import ForecastModel, ModelMetadata, ModelParams
from forecasting_models.registry import MODEL_REGISTRY, get_model, list_models, register_model

__all__ = [
    "MODEL_REGISTRY",
    "ForecastModel",
    "ModelMetadata",
    "ModelParams",
    "egarch",
    "garch",
    "gbm",
    "get_model",
    "heston",
    "historical_bootstrap",
    "jump_diffusion",
    "list_models",
    "register_model",
    "regime_switching",
]
