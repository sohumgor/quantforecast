from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_company_info_cache
from api.schemas.company import CompanyInfoResponse
from data_ingestion.company_info_cache import CompanyInfoCache

router = APIRouter()


@router.get("/company/{ticker}", response_model=CompanyInfoResponse)
def get_company_info(
    ticker: str, cache: CompanyInfoCache = Depends(get_company_info_cache)
) -> CompanyInfoResponse:
    ticker = ticker.upper()
    try:
        info = cache.get_or_fetch(ticker)
    except Exception as exc:
        raise HTTPException(
            status_code=404, detail=f"No company info available for '{ticker}'"
        ) from exc

    return CompanyInfoResponse(
        ticker=info.ticker,
        name=info.name,
        description=info.description,
        website=info.website,
        sector=info.sector,
        industry=info.industry,
    )
