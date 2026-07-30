// Mirrors backend/api/schemas/analysis.py

import type {
  DensityInfo,
  ExplanationInfo,
  FanChartInfo,
  ModelParamsInfo,
  RiskAnalyticsInfo,
} from "./forecast";
import type { RegimeLabelValue } from "./regime";

export interface RegimeInfo {
  label: RegimeLabelValue;
  confidence: number;
  posterior: Record<string, number>;
  as_of: string;
}

export interface ModelScoreInfo {
  name: string;
  display_name: string;
  composite_score: number;
  confidence: number;
  n_observations: number;
}

export type AnalysisStalenessReason = "no_history" | "stale" | "fresh";

export interface AnalysisStatusResponse {
  ticker: string;
  stale: boolean;
  reason: AnalysisStalenessReason;
  last_backtest_at: string | null;
  max_age_days: number;
}

export interface AnalyzeRequest {
  ticker: string;
  n_sims?: number;
  horizon_days?: number;
  start?: string | null;
  end?: string | null;
}

export interface AnalysisResponse {
  ticker: string;
  current_price: number;
  regime: RegimeInfo;
  used_fallback: boolean;
  ranked_models: ModelScoreInfo[];
  explanation: ExplanationInfo;
  selected_model: ModelParamsInfo;
  risk_analytics: RiskAnalyticsInfo;
  fan_chart: FanChartInfo;
  density: DensityInfo;
}
