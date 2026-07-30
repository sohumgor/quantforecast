import type { ForecastRequest, ForecastResponse } from "@shared/types";

import { apiPost } from "./client";

export function runForecast(request: ForecastRequest): Promise<ForecastResponse> {
  return apiPost<ForecastResponse>("/api/forecast", request);
}
