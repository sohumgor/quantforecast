"use client";

import { use, useState } from "react";
import type {
  CompanyInfoResponse,
  FeatureSetResponse,
  PerformanceTableResponse,
  RegimeTimelineResponse,
} from "@shared/types";

import { ConfidenceConeChart } from "@/components/charts/ConfidenceConeChart";
import { FeatureImportanceChart } from "@/components/charts/FeatureImportanceChart";
import { HistoricalVolChart } from "@/components/charts/HistoricalVolChart";
import { MonteCarloFanChart } from "@/components/charts/MonteCarloFanChart";
import { ProbabilityDensityChart } from "@/components/charts/ProbabilityDensityChart";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AdvancedDiagnosticsPanel } from "@/components/panels/AdvancedDiagnosticsPanel";
import { AnalysisWorkflow } from "@/components/panels/AnalysisWorkflow";
import { ExecutiveSummary } from "@/components/panels/ExecutiveSummary";
import { ForecastHighlights } from "@/components/panels/ForecastHighlights";
import { Hero } from "@/components/panels/Hero";
import { HorizonBar } from "@/components/panels/HorizonBar";
import { PredictionSummaryCard } from "@/components/panels/PredictionSummaryCard";
import { QuickStatsRow } from "@/components/panels/QuickStatsRow";
import { RecommendationPanel } from "@/components/panels/RecommendationPanel";
import { RegimePanel } from "@/components/panels/RegimePanel";
import { RiskSummaryCard } from "@/components/panels/RiskSummaryCard";
import { Badge } from "@/components/ui/Badge";
import { ChartCard } from "@/components/ui/ChartCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState, Spinner } from "@/components/ui/Spinner";
import { getBacktestPerformance } from "@/lib/api/backtest";
import { getCompanyInfo } from "@/lib/api/company";
import { getFeatures } from "@/lib/api/features";
import { getRegimeHistory } from "@/lib/api/regime";
import { useAnalysis } from "@/lib/hooks/useAnalysis";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMode } from "@/lib/hooks/useMode";
import { useTickerReadiness } from "@/lib/hooks/useTickerReadiness";
import { buildExecutiveSummary } from "@/lib/interpret/executiveSummary";
import {
  computeFeaturePercentiles,
  mostExtremeFeature,
  percentileDescriptor,
} from "@/lib/interpret/features";
import { domainFromUrl, formatCurrency, tradingDayToDate, formatFullDate } from "@/lib/interpret/format";
import { DEFAULT_HORIZON_DAYS, FORECAST_HORIZONS } from "@/lib/interpret/horizon";
import { classifyConfidence } from "@/lib/interpret/recommendation";
import { annualizedVolToDailyPct, classifyRiskLevel } from "@/lib/interpret/risk";
import {
  classifyVolatilityLevel,
  compareVolatilityToHistory,
  VOLATILITY_LEVEL_ICON,
} from "@/lib/interpret/volatility";

interface AnalyzePageProps {
  params: Promise<{ ticker: string }>;
}

export default function AnalyzePage({ params }: AnalyzePageProps) {
  const { ticker: rawTicker } = use(params);
  const ticker = rawTicker.toUpperCase();
  const { mode } = useMode();
  const [horizonDays, setHorizonDays] = useState(DEFAULT_HORIZON_DAYS);

  const readiness = useTickerReadiness(ticker);
  const { data, loading, refetching, error, refetch } = useAnalysis(ticker, {
    n_sims: 5000,
    horizon_days: horizonDays,
    enabled: readiness.ready,
  });
  const timeline = useApiResource<RegimeTimelineResponse>(() => getRegimeHistory(ticker), [ticker]);
  const features = useApiResource<FeatureSetResponse>(() => getFeatures(ticker), [ticker]);
  const performance = useApiResource<PerformanceTableResponse>(
    () => getBacktestPerformance(ticker),
    [ticker, readiness.ready],
  );
  const company = useApiResource<CompanyInfoResponse>(() => getCompanyInfo(ticker), [ticker]);

  // A ticker with no fresh per-ticker backtest gets the full progress
  // workflow instead of a bare skeleton — through both the backtest job
  // itself and the `/analyze` call that follows it, so every step in the
  // pipeline the user is told about actually corresponds to real work.
  const cameFromColdStart = readiness.reason === "no_history" || readiness.reason === "stale";
  const showWorkflow = cameFromColdStart && (readiness.runningBacktest || (readiness.ready && loading));

  if (showWorkflow) {
    return (
      <DashboardShell>
        <AnalysisWorkflow
          ticker={ticker}
          reason={readiness.reason}
          stage={readiness.stage}
          progress={readiness.progress}
          backtestRunning={readiness.runningBacktest}
          analyzing={readiness.ready && loading}
          onCancel={readiness.cancel}
          cancelling={readiness.cancelling}
        />
      </DashboardShell>
    );
  }

  if (!readiness.ready || loading) {
    return (
      <DashboardShell>
        <div className="space-y-8">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !data) {
    return (
      <DashboardShell>
        <ErrorState message={error ?? `Couldn't load an analysis for ${ticker}.`} onRetry={refetch} />
      </DashboardShell>
    );
  }

  const isAdvanced = mode === "advanced";
  const horizonOption = FORECAST_HORIZONS.find((h) => h.days === horizonDays) ?? FORECAST_HORIZONS[1];
  const historyDays = features.data?.rows.length ?? null;
  const todaysMove = features.data?.latest.return;
  const topModel =
    data.ranked_models.find((m) => m.name === data.selected_model.model_name) ??
    data.ranked_models[0];

  const p5Series = data.fan_chart.percentiles.p5 ?? [];
  const p50Series = data.fan_chart.percentiles.p50 ?? [];
  const p95Series = data.fan_chart.percentiles.p95 ?? [];
  const finalLow = p5Series[p5Series.length - 1] ?? data.current_price;
  const finalMedian = p50Series[p50Series.length - 1] ?? data.current_price;
  const finalHigh = p95Series[p95Series.length - 1] ?? data.current_price;
  const forecastOrigin = new Date();
  const finalDate = tradingDayToDate(forecastOrigin, horizonDays);

  const companyName = company.data?.name ?? data.ticker;
  const executiveSummaryText = buildExecutiveSummary(data, horizonOption.label, company.data?.name);

  const ciLowerPrice = data.current_price * (1 + data.risk_analytics.distribution.ci_lower_90);
  const ciUpperPrice = data.current_price * (1 + data.risk_analytics.distribution.ci_upper_90);

  const dailyVolPct =
    typeof features.data?.latest.rolling_vol_21d === "number"
      ? annualizedVolToDailyPct(features.data.latest.rolling_vol_21d)
      : null;

  const volComparison = features.data ? compareVolatilityToHistory(features.data.rows, ticker) : null;
  const volatilityLevel = volComparison ? classifyVolatilityLevel(volComparison.latestPct) : null;
  const featureEntries = features.data ? computeFeaturePercentiles(features.data.rows) : [];
  const topFeature = mostExtremeFeature(featureEntries);
  const topFeatureDescriptor = topFeature ? percentileDescriptor(topFeature.percentile) : null;

  const forecastSectionClass = `space-y-8 transition-opacity duration-300 ${
    refetching ? "opacity-50" : "opacity-100"
  }`;

  const analysisSourceNote =
    readiness.reason === "fresh"
      ? "Loaded from previous analysis."
      : cameFromColdStart
        ? `Historical analysis complete — this recommendation is grounded in ${data.ticker}'s own backtest, not a generic default.`
        : null;

  return (
    <DashboardShell>
      <div className="space-y-8">
        {analysisSourceNote ? (
          <p className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600">
            <span className="text-emerald-500">✓</span> {analysisSourceNote}
          </p>
        ) : null}

        <Hero
          companyName={companyName}
          ticker={data.ticker}
          description={company.data?.description ?? null}
          domain={domainFromUrl(company.data?.website ?? null)}
          currentPrice={data.current_price}
          todaysMove={typeof todaysMove === "number" ? todaysMove : null}
        />

        <ExecutiveSummary summary={executiveSummaryText} />

        <HorizonBar
          value={horizonDays}
          onChange={setHorizonDays}
          historyDays={historyDays}
          tickerSymbol={data.ticker}
          refetching={refetching}
        />

        <div className={forecastSectionClass}>
          <QuickStatsRow
            volatilityLevel={volatilityLevel}
            riskLevel={classifyRiskLevel(data.risk_analytics.value_at_risk_95)}
            confidenceLevel={classifyConfidence(topModel.confidence)}
            modelDisplayName={data.selected_model.display_name}
            probPositiveReturn={data.risk_analytics.distribution.prob_positive_return}
            lowPrice={finalLow}
            highPrice={finalHigh}
          />

          <PredictionSummaryCard
            tickerSymbol={data.ticker}
            horizonLabel={horizonOption.label}
            medianPrice={finalMedian}
            lowPrice={finalLow}
            highPrice={finalHigh}
            probPositiveReturn={data.risk_analytics.distribution.prob_positive_return}
          />

          <ChartCard
            title={isAdvanced ? "Monte Carlo Forecast (Full Detail)" : "Price Forecast"}
            explanation={`${data.selected_model.display_name} projects ${data.ticker}'s price forward from thousands of simulated scenarios.`}
            interpretation={
              <ForecastHighlights
                tickerSymbol={data.ticker}
                dateLabel={formatFullDate(finalDate)}
                lowPrice={finalLow}
                medianPrice={finalMedian}
                highPrice={finalHigh}
                currentPrice={data.current_price}
              />
            }
          >
            {isAdvanced ? (
              <MonteCarloFanChart
                fanChart={data.fan_chart}
                currentPrice={data.current_price}
                startDate={forecastOrigin}
              />
            ) : (
              <ConfidenceConeChart
                fanChart={data.fan_chart}
                currentPrice={data.current_price}
                startDate={forecastOrigin}
              />
            )}
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RegimePanel
            regime={data.regime}
            timelinePoints={timeline.data?.points ?? null}
            timelineLoading={timeline.loading}
            tickerSymbol={data.ticker}
            selectedModelDisplayName={data.selected_model.display_name}
          />
          <RecommendationPanel
            explanation={data.explanation}
            rankedModels={data.ranked_models}
            usedFallback={data.used_fallback}
            selectedModelName={data.selected_model.model_name}
            regime={data.regime}
            tickerSymbol={data.ticker}
          />
        </div>

        <div className={`grid gap-4 lg:grid-cols-2 ${forecastSectionClass}`}>
          <ChartCard
            title="Outcome Distribution"
            explanation="Shows how often each final price occurred across every simulated scenario."
            interpretation={`Most simulations landed between ${formatCurrency(ciLowerPrice)} and ${formatCurrency(
              ciUpperPrice,
            )} (the middle 90% of outcomes), clustered around today's price of ${formatCurrency(data.current_price)}.`}
          >
            <ProbabilityDensityChart density={data.density} currentPrice={data.current_price} />
          </ChartCard>
          <RiskSummaryCard
            risk={data.risk_analytics}
            currentPrice={data.current_price}
            tickerSymbol={data.ticker}
            dailyVolPct={dailyVolPct}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Historical Volatility"
            explanation={`How much ${data.ticker}'s price has swung day-to-day over time, expressed as an annualized percentage.`}
            interpretation={volComparison?.sentence}
          >
            {volComparison && volatilityLevel ? (
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge
                  variant={
                    volatilityLevel === "Low"
                      ? "good"
                      : volatilityLevel === "Medium"
                        ? "warning"
                        : "critical"
                  }
                >
                  {VOLATILITY_LEVEL_ICON[volatilityLevel]} {volatilityLevel}
                </Badge>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Current: <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {volComparison.latestPct.toFixed(0)}%
                  </span>
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Typical: <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {volComparison.averagePct.toFixed(0)}%
                  </span>
                </span>
              </div>
            ) : null}
            {features.loading ? (
              <Skeleton className="h-[280px] w-full rounded-lg" />
            ) : features.data ? (
              <HistoricalVolChart rows={features.data.rows} />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Unavailable.</p>
            )}
          </ChartCard>
          <ChartCard
            title="Regime-Driving Features"
            explanation={`Five signals compared to ${data.ticker}'s own history — this combination is what led to the current regime classification below.`}
            interpretation={
              topFeature && topFeatureDescriptor
                ? `${data.ticker}'s ${topFeature.label.toLowerCase()} is currently ${topFeatureDescriptor.label.toLowerCase()} compared to its own history — the most unusual of these five signals, and the biggest driver of the current classification.`
                : undefined
            }
          >
            {features.loading ? (
              <Skeleton className="h-[220px] w-full rounded-lg" />
            ) : features.data ? (
              <FeatureImportanceChart rows={features.data.rows} />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Unavailable.</p>
            )}
          </ChartCard>
        </div>

        {isAdvanced ? (
          <AdvancedDiagnosticsPanel
            model={data.selected_model}
            risk={data.risk_analytics}
            regime={data.regime}
            tickerSymbol={data.ticker}
            performance={performance.data}
            performanceLoading={performance.loading}
          />
        ) : null}

        {timeline.loading || features.loading ? (
          <p className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-600">
            <Spinner className="h-3 w-3" /> Loading supplementary data…
          </p>
        ) : null}
      </div>
    </DashboardShell>
  );
}
