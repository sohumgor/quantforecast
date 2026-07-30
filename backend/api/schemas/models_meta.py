from __future__ import annotations

from pydantic import BaseModel


class ModelMetadataResponse(BaseModel):
    name: str
    display_name: str
    category: str
    supports_regimes: bool
    is_implemented: bool
    description: str


class ModelsListResponse(BaseModel):
    models: list[ModelMetadataResponse]
