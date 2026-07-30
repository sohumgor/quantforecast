import type { AnalysisStalenessReason, BacktestStage } from "@shared/types";

import { Spinner } from "@/components/ui/Spinner";

type StepStatus = "done" | "active" | "pending";

interface Step {
  label: string;
  detail?: string;
}

interface AnalysisWorkflowProps {
  ticker: string;
  reason: AnalysisStalenessReason | null;
  stage: BacktestStage | null;
  progress: [number, number] | null;
  /** True while the ticker-specific backtest job is running. */
  backtestRunning: boolean;
  /** True while the subsequent `/analyze` call (model selection + Monte
   * Carlo simulation) is in flight, after the backtest has finished. */
  analyzing: boolean;
  onCancel: () => void;
  cancelling: boolean;
}

const STAGE_ORDER: BacktestStage[] = [
  "downloading_prices",
  "detecting_regime",
  "running_backtests",
  "aggregating_results",
  "done",
];

/** Full-screen (within the shell) replacement for a loading spinner: shows
 * the same 7-step pipeline every analysis actually runs through, with each
 * step's status driven by real backend progress (the job's `stage`/`progress`
 * fields, and whether the follow-up `/analyze` call is in flight) — never a
 * client-side timer standing in for work that hasn't happened yet.
 */
export function AnalysisWorkflow({
  ticker,
  reason,
  stage,
  progress,
  backtestRunning,
  analyzing,
  onCancel,
  cancelling,
}: AnalysisWorkflowProps) {
  const statuses = computeStatuses(stage, backtestRunning, analyzing);
  const steps = buildSteps(ticker, progress);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-black/[.06] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-sm dark:border-white/[.08] dark:from-zinc-950 dark:to-zinc-900 sm:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Analyzing {ticker}…
        </h1>
        <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {reason === "no_history"
            ? `This is the first time we're analyzing ${ticker}. Running a full historical backtest so the model recommendation is grounded in ${ticker}'s own track record, not a generic default.`
            : `Running a new historical analysis because newer market data is available for ${ticker}.`}
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <StepRow key={step.label} step={step} status={statuses[i]} />
        ))}
      </ol>

      {backtestRunning ? (
        <div>
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            {cancelling ? <Spinner className="h-3 w-3" /> : null}
            {cancelling ? "Skipping…" : "Skip and use the standard model instead"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function buildSteps(ticker: string, progress: [number, number] | null): Step[] {
  const backtestDetail =
    progress && progress[1] > 0 ? `${progress[0]} / ${progress[1]} windows scored` : undefined;
  return [
    { label: "Downloading historical prices" },
    { label: "Detecting current market regime" },
    { label: "Running historical backtests", detail: backtestDetail },
    { label: "Comparing forecasting models" },
    { label: "Selecting the most accurate model" },
    { label: `Generating Monte Carlo simulations for ${ticker}` },
    { label: "Building forecast dashboard" },
  ];
}

function computeStatuses(
  stage: BacktestStage | null,
  backtestRunning: boolean,
  analyzing: boolean,
): StepStatus[] {
  const statuses: StepStatus[] = new Array(7).fill("pending") as StepStatus[];

  if (!backtestRunning) {
    // The backtest (if any ran) is done — steps 0-4 are behind us. What's
    // left is the live /analyze call, covering simulation + dashboard build.
    for (let i = 0; i < 5; i++) statuses[i] = "done";
    statuses[5] = statuses[6] = analyzing ? "active" : "done";
    return statuses;
  }

  const stageIndex = stage ? STAGE_ORDER.indexOf(stage) : 0;
  for (let i = 0; i < 3; i++) {
    statuses[i] = stageIndex > i ? "done" : stageIndex === i ? "active" : "pending";
  }
  // "Comparing forecasting models" and "Selecting the most accurate model"
  // both correspond to the backend's single "aggregating_results" stage —
  // shown as concurrently active rather than faking a split that isn't real.
  if (stageIndex >= 3) {
    statuses[3] = statuses[4] = stageIndex > 3 ? "done" : "active";
  }
  return statuses;
}

function StepRow({ step, status }: { step: Step; status: StepStatus }) {
  return (
    <li className="flex items-start gap-3">
      <StepIcon status={status} />
      <div>
        <p
          className={`text-sm ${
            status === "pending"
              ? "text-zinc-400 dark:text-zinc-600"
              : "font-medium text-zinc-800 dark:text-zinc-200"
          }`}
        >
          {step.label}
        </p>
        {status === "active" && step.detail ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{step.detail}</p>
        ) : null}
      </div>
    </li>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5" aria-hidden="true">
          <path
            d="M3 8.5l3 3 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <Spinner className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-zinc-300 dark:border-zinc-700" />
  );
}
