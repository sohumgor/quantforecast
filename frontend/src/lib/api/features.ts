import type { FeatureSetResponse } from "@shared/types";

import { apiGet } from "./client";

export function getFeatures(ticker: string): Promise<FeatureSetResponse> {
  return apiGet<FeatureSetResponse>(`/api/features/${encodeURIComponent(ticker)}`);
}
