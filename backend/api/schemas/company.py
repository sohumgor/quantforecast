from __future__ import annotations

from pydantic import BaseModel


class CompanyInfoResponse(BaseModel):
    ticker: str
    name: str
    description: str
    website: str | None = None
    sector: str | None = None
    industry: str | None = None
