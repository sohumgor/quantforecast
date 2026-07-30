import type { ExplanationInfo, ModelScoreInfo, RegimeInfo } from "@shared/types";

import { Disclosure } from "@/components/ui/Disclosure";
import { buildRecommendationNarrative } from "@/lib/interpret/recommendation";

import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

function TargetIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10 1.5l2.47 5.51 5.98.6-4.52 4 1.34 5.89L10 14.98l-5.27 2.52 1.34-5.89-4.52-4 5.98-.6L10 1.5z" />
    </svg>
  );
}

interface RecommendationPanelProps {
  explanation: ExplanationInfo;
  rankedModels: ModelScoreInfo[];
  usedFallback: boolean;
  selectedModelName: string;
  regime: RegimeInfo;
  tickerSymbol: string;
}

export function RecommendationPanel({
  explanation,
  rankedModels,
  usedFallback,
  selectedModelName,
  regime,
  tickerSymbol,
}: RecommendationPanelProps) {
  const topModel = rankedModels.find((m) => m.name === selectedModelName) ?? rankedModels[0];
  const narrative = buildRecommendationNarrative(topModel, regime, usedFallback, tickerSymbol);
  const topThree = rankedModels.slice(0, 3);

  return (
    <Card
      title="Recommended Model"
      action={usedFallback ? <Badge variant="muted">Cold start</Badge> : undefined}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white dark:bg-blue-500"
          aria-hidden="true"
        >
          <TargetIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {topModel.display_name}
          </p>
          <p className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
            <StarIcon className="h-3.5 w-3.5" /> Confidence: {narrative.confidenceLevel}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        <p>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Why this model: </span>
          {narrative.whyChosen}
        </p>
        <p>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            When it performs well:{" "}
          </span>
          {narrative.whenItPerformsWell}
        </p>
        <p>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">How confident we are: </span>
          {narrative.confidenceNote}
        </p>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          How it compared — top {topThree.length}
        </p>
        <div className="space-y-1.5">
          {topThree.map((m, i) => (
            <div
              key={m.name}
              className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <span
                className={`flex items-center gap-2 font-medium ${
                  m.name === selectedModelName
                    ? "text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-600">
                  #{i + 1}
                </span>
                {m.display_name}
                {m.name === selectedModelName ? <Badge variant="good">Selected</Badge> : null}
              </span>
              <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                {m.composite_score.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Disclosure
        title="Technical Details"
        summary="Composite scores, statistical basis, and the full model ranking."
        className="mt-5"
      >
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {explanation.summary}
        </p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {explanation.regime_confidence_note}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">What it assumes: </span>
          {narrative.whatItAssumes}
        </p>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Full ranking (lower composite score = better)
          </p>
          {rankedModels.map((m) => (
            <div
              key={m.name}
              className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <span
                className={`flex items-center gap-2 font-medium ${
                  m.name === selectedModelName
                    ? "text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {m.display_name}
                {m.name === selectedModelName ? <Badge variant="good">Selected</Badge> : null}
              </span>
              <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                {m.composite_score.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      </Disclosure>
    </Card>
  );
}
