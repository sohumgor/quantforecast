// Mirrors backend/api/schemas/regime.py

export type RegimeLabelValue =
  | "low_vol"
  | "medium_vol"
  | "high_vol"
  | "high_vol_jumps"
  | "trending"
  | "sideways"
  | "stress_crisis";

export interface RegimeResponse {
  ticker: string;
  as_of: string;
  label: RegimeLabelValue;
  confidence: number;
  posterior: Record<string, number>;
  raw_state_id: number;
  method: "hmm" | "gmm";
  n_states_fit: number;
}

export interface RegimeTimelinePoint {
  date: string;
  label: RegimeLabelValue;
  confidence: number;
}

export interface RegimeTimelineResponse {
  ticker: string;
  points: RegimeTimelinePoint[];
}
