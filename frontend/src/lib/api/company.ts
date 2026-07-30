import type { CompanyInfoResponse } from "@shared/types";

import { apiGet } from "./client";

export function getCompanyInfo(ticker: string): Promise<CompanyInfoResponse> {
  return apiGet<CompanyInfoResponse>(`/api/company/${encodeURIComponent(ticker)}`);
}
