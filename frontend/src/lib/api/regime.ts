import type { RegimeResponse, RegimeTimelineResponse } from "@shared/types";

import { apiGet } from "./client";

export function getCurrentRegime(ticker: string): Promise<RegimeResponse> {
  return apiGet<RegimeResponse>(`/api/regime/${encodeURIComponent(ticker)}`);
}

export function getRegimeHistory(ticker: string): Promise<RegimeTimelineResponse> {
  return apiGet<RegimeTimelineResponse>(`/api/regime/${encodeURIComponent(ticker)}/history`);
}
