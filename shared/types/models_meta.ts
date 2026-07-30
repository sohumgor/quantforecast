// Mirrors backend/api/schemas/models_meta.py

export interface ModelMetadataResponse {
  name: string;
  display_name: string;
  category: "diffusion" | "jump" | "stochastic_vol" | "empirical" | "regime";
  supports_regimes: boolean;
  is_implemented: boolean;
  description: string;
}

export interface ModelsListResponse {
  models: ModelMetadataResponse[];
}
