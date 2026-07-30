// Hand-written mirrors of backend/api/schemas/common.py. Kept manually in sync
// for now; see documentation/architecture.md for the planned openapi-typescript
// upgrade once the API surface stabilizes.

export interface PriceBar {
  date: string; // ISO date, e.g. "2024-01-02"
  open: number;
  high: number;
  low: number;
  close: number;
  adj_close: number;
  volume: number;
}

export interface PriceHistoryResponse {
  ticker: string;
  bars: PriceBar[];
}

export interface FeatureRow {
  date: string;
  values: Record<string, number>;
}

export interface FeatureSetResponse {
  ticker: string;
  rows: FeatureRow[];
  latest: Record<string, number>;
  metadata: Record<string, string>;
}
