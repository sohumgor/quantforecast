import type { ModelsListResponse } from "@shared/types";

import { apiGet } from "./client";

export function listModels(): Promise<ModelsListResponse> {
  return apiGet<ModelsListResponse>("/api/models");
}
