"use client";

import { useState, type FormEvent } from "react";
import type {
  BacktestDetailResponse,
  BacktestHistoryResponse,
  ModelsListResponse,
  PerformanceTableResponse,
} from "@shared/types";

import { BacktestTimelineChart } from "@/components/charts/BacktestTimelineChart";
import { ModelComparisonHeatmap } from "@/components/charts/ModelComparisonHeatmap";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BacktestReliabilityCard } from "@/components/panels/BacktestReliabilityCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ChartCard } from "@/components/ui/ChartCard";
import { Disclosure } from "@/components/ui/Disclosure";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import {
  getBacktestDetail,
  getBacktestHistory,
  getBacktestPerformance,
  submitBacktest,
} from "@/lib/api/backtest";
import { listModels } from "@/lib/api/models";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useBacktestJob } from "@/lib/hooks/useBacktestJob";
import { formatPercent } from "@/lib/interpret/format";

function yearsAgo(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
}

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export default function BacktestPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [trainStart, setTrainStart] = useState(yearsAgo(6));
  const [trainEnd, setTrainEnd] = useState(yearsAgo(3));
  const [testStart, setTestStart] = useState(yearsAgo(3));
  const [testEnd, setTestEnd] = useState(yearsAgo(0));
  const [horizonDays, setHorizonDays] = useState(21);
  const [nSims, setNSims] = useState(2000);
  const [windowStepDays, setWindowStepDays] = useState(10);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // `viewedRunId` is only set by explicit user action (submitting a new job,
  // or clicking a past run) — the run actually on screen falls back to
  // whichever job just completed, without needing an effect to sync it.
  const [viewedRunId, setViewedRunId] = useState<string | null>(null);
  const [activeModelName, setActiveModelName] = useState<string | null>(null);

  const models = useApiResource<ModelsListResponse>(() => listModels(), []);
  const job = useBacktestJob(jobId);
  const jobStatus = job.result?.status;
  const jobRunId = job.result?.run_id ?? null;
  const activeRunId = viewedRunId ?? (jobStatus === "done" ? jobRunId : null);

  const performance = useApiResource<PerformanceTableResponse | null>(
    () => (activeRunId ? getBacktestPerformance(ticker) : Promise.resolve(null)),
    [activeRunId, ticker],
  );
  const history = useApiResource<BacktestHistoryResponse | null>(
    () => (ticker ? getBacktestHistory(ticker) : Promise.resolve(null)),
    [ticker, jobStatus],
  );
  const detail = useApiResource<BacktestDetailResponse | null>(
    () =>
      activeRunId
        ? getBacktestDetail(ticker, activeRunId, activeModelName ?? undefined)
        : Promise.resolve(null),
    [ticker, activeRunId, activeModelName],
  );

  const modelDisplayNames = Object.fromEntries(
    (models.data?.models ?? []).map((m) => [m.name, m.display_name]),
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    setViewedRunId(null);
    setActiveModelName(null);
    try {
      const response = await submitBacktest({
        ticker: ticker.toUpperCase(),
        train_start: trainStart,
        train_end: trainEnd,
        test_start: testStart,
        test_end: testEnd,
        horizon_days: horizonDays,
        n_sims: nSims,
        window_step_days: windowStepDays,
        models: selectedModels.length > 0 ? selectedModels : null,
      });
      setJobId(response.job_id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit backtest.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleModel(name: string) {
    setSelectedModels((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name],
    );
  }

  const statusVariant =
    jobStatus === "done" ? "good" : jobStatus === "failed" ? "critical" : "default";

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Backtest
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            See how well each forecasting model would have predicted this stock&apos;s actual
            price history, tested on real out-of-sample data it never saw during calibration.
          </p>
        </div>

        <Card title="Configuration">
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Ticker</span>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className={`${inputClasses} font-mono uppercase`}
                maxLength={10}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Train start</span>
              <input
                type="date"
                value={trainStart}
                onChange={(e) => setTrainStart(e.target.value)}
                className={inputClasses}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Train end</span>
              <input
                type="date"
                value={trainEnd}
                onChange={(e) => setTrainEnd(e.target.value)}
                className={inputClasses}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Test start</span>
              <input
                type="date"
                value={testStart}
                onChange={(e) => setTestStart(e.target.value)}
                className={inputClasses}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Test end</span>
              <input
                type="date"
                value={testEnd}
                onChange={(e) => setTestEnd(e.target.value)}
                className={inputClasses}
                required
              />
            </label>

            <div className="sm:col-span-2 lg:col-span-3">
              <span className="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">
                Models (leave empty to run all implemented models)
              </span>
              <div className="flex flex-wrap gap-2">
                {(models.data?.models ?? [])
                  .filter((m) => m.is_implemented)
                  .map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => toggleModel(m.name)}
                      aria-pressed={selectedModels.includes(m.name)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        selectedModels.includes(m.name)
                          ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {m.display_name}
                    </button>
                  ))}
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <Disclosure
                title="Advanced options"
                summary="Forecast horizon, simulation count, and window step — the defaults work well for most tickers."
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Forecast horizon (days)</span>
                    <input
                      type="number"
                      min={1}
                      value={horizonDays}
                      onChange={(e) => setHorizonDays(Number(e.target.value))}
                      className={inputClasses}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Simulations per window</span>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      value={nSims}
                      onChange={(e) => setNSims(Number(e.target.value))}
                      className={inputClasses}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Window step (days)</span>
                    <input
                      type="number"
                      min={1}
                      value={windowStepDays}
                      onChange={(e) => setWindowStepDays(Number(e.target.value))}
                      className={inputClasses}
                      required
                    />
                  </label>
                </div>
              </Disclosure>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={submitting || job.isPolling}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {submitting ? "Submitting…" : "Run Backtest"}
              </button>
            </div>
          </form>
          {submitError ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{submitError}</p>
          ) : null}
        </Card>

        {jobId ? (
          <Card title="Backtest Progress">
            <div className="flex items-center gap-3">
              {job.isPolling ? <Spinner className="h-4 w-4" /> : null}
              <Badge variant={statusVariant}>{jobStatus ?? "queued"}</Badge>
              <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">{jobId}</span>
            </div>
            {jobStatus === "failed" && job.result?.error ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{job.result.error}</p>
            ) : null}
            {jobStatus === "done" && job.result?.rankings ? (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                Overall ranking (best mean CRPS first):{" "}
                {job.result.rankings
                  .map((r, i) => `${i + 1}. ${modelDisplayNames[r] ?? r}`)
                  .join("  ·  ")}
                {" — see the results below."}
              </p>
            ) : null}
          </Card>
        ) : null}

        {activeRunId ? (
          detail.loading ? (
            <Skeleton className="h-96 rounded-2xl" />
          ) : detail.data && detail.data.points.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Viewing model
                </span>
                {detail.data.available_models.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActiveModelName(name)}
                    aria-pressed={detail.data?.model_name === name}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      detail.data?.model_name === name
                        ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {modelDisplayNames[name] ?? name}
                  </button>
                ))}
              </div>

              <ChartCard
                title="How Close Was The Model?"
                explanation={`Compares what ${detail.data.model_display_name} predicted at each rolling forecast point in ${ticker}'s test period against what actually happened.`}
                interpretation={`On average, predictions were off by about ${formatPercent(
                  detail.data.mean_absolute_pct_error,
                  1,
                )}, and ${formatPercent(
                  detail.data.coverage_90,
                )} of actual outcomes landed inside the shaded predicted range.`}
              >
                <BacktestTimelineChart points={detail.data.points} />
              </ChartCard>

              <BacktestReliabilityCard
                modelDisplayName={detail.data.model_display_name}
                tickerSymbol={ticker}
                nWindows={detail.data.points.length}
                meanAbsolutePctError={detail.data.mean_absolute_pct_error}
                coverage90={detail.data.coverage_90}
                directionalAccuracy={detail.data.directional_accuracy}
              />
            </>
          ) : (
            <Card title="How Close Was The Model?">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No windows were scored for this run — try a wider test period.
              </p>
            </Card>
          )
        ) : null}

        {activeRunId && performance.data && performance.data.rows.length > 0 ? (
          <Disclosure
            title="Technical Details: Model Comparison Across Regimes"
            summary="A deeper look at every model's average forecasting error, broken down by market condition."
          >
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
              {`Each square shows a model's mean CRPS (a measure of typical forecast error — lower is better) when ${ticker} was in that market condition. Use it to compare models within a single regime, not across regimes (different conditions aren't on the same scale).`}
            </p>
            <ModelComparisonHeatmap
              rows={performance.data.rows}
              modelDisplayNames={modelDisplayNames}
            />
          </Disclosure>
        ) : null}

        {history.data && history.data.run_ids.length > 0 ? (
          <Card title="Past Runs" subtitle={`for ${ticker} — click one to view its results above`}>
            <ul className="flex flex-wrap gap-2">
              {history.data.run_ids
                .slice()
                .reverse()
                .map((runId) => (
                  <li key={runId}>
                    <button
                      type="button"
                      onClick={() => {
                        setViewedRunId(runId);
                        setActiveModelName(null);
                      }}
                      className={`rounded-full px-3 py-1 font-mono text-xs transition ${
                        activeRunId === runId
                          ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {runId}
                    </button>
                  </li>
                ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </DashboardShell>
  );
}
