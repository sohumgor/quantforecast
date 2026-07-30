from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter

from api.schemas.models_meta import ModelMetadataResponse, ModelsListResponse
from forecasting_models.registry import list_models

router = APIRouter()


@router.get("/models", response_model=ModelsListResponse)
def get_models() -> ModelsListResponse:
    return ModelsListResponse(
        models=[ModelMetadataResponse(**asdict(meta)) for meta in list_models()]
    )
