from __future__ import annotations

from forecasting_models.base import ForecastModel, ModelMetadata

MODEL_REGISTRY: dict[str, type[ForecastModel]] = {}


def register_model(cls: type[ForecastModel]) -> type[ForecastModel]:
    """Class decorator: registers a `ForecastModel` implementation under its
    `metadata.name`. Discovery is explicit (via imports in `__init__.py`), not
    dynamic package scanning — simpler and mypy-friendly."""
    MODEL_REGISTRY[cls.metadata.name] = cls
    return cls


def get_model(name: str) -> ForecastModel:
    if name not in MODEL_REGISTRY:
        raise KeyError(f"No forecasting model registered under '{name}'")
    return MODEL_REGISTRY[name]()


def list_models(only_implemented: bool = False) -> list[ModelMetadata]:
    metas = [cls.metadata for cls in MODEL_REGISTRY.values()]
    if only_implemented:
        metas = [m for m in metas if m.is_implemented]
    return sorted(metas, key=lambda m: m.name)
