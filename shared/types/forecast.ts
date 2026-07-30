// Mirrors backend/api/schemas/forecast.py

export interface DrawdownInfo {
  mean_max_drawdown: number;
  worst_case_drawdown: number;
}

export interface DistributionInfo {
  expected_return: number;
  median_return: number;
  ci_lower_90: number;
  ci_upper_90: number;
  prob_positive_return: number;
  worst_5pct: number;
  best_5pct: number;
}

export interface RiskAnalyticsInfo {
  value_at_risk_95: number;
  expected_shortfall_95: number;
  drawdown: DrawdownInfo;
  distribution: DistributionInfo;
}

export interface FanChartInfo {
  horizon_days: number[];
  percentiles: Record<string, number[]>; // e.g. "p5" -> values
}

export interface DensityInfo {
  bin_edges: number[];
  counts: number[];
}

export interface ModelParamsInfo {
  model_name: string;
  display_name: string;
  params: Record<string, number>;
}

export interface ExplanationInfo {
  summary: string;
  regime_description: string;
  regime_confidence_note: string;
  performance_basis: string;
  driving_features: string[];
}

export interface ForecastRequest {
  ticker: string;
  model_name?: string | null;
  n_sims?: number;
  horizon_days?: number;
  start?: string | null;
  end?: string | null;
}

export interface ForecastResponse {
  ticker: string;
  current_price: number;
  auto_selected: boolean;
  explanation: ExplanationInfo | null;
  model: ModelParamsInfo;
  risk_analytics: RiskAnalyticsInfo;
  fan_chart: FanChartInfo;
  density: DensityInfo;
}
