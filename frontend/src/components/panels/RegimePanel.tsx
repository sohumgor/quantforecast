import type { RegimeInfo, RegimeTimelinePoint } from "@shared/types";

import { RegimeTimelineChart } from "@/components/charts/RegimeTimelineChart";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { computeRegimeFrequency, modelInfluenceSentence, REGIME_EDUCATION } from "@/lib/interpret/regime";
import { REGIME_DISPLAY_LABEL } from "@/lib/regime";

interface RegimePanelProps {
  regime: RegimeInfo;
  timelinePoints: RegimeTimelinePoint[] | null;
  timelineLoading: boolean;
  tickerSymbol: string;
  selectedModelDisplayName: string;
}

export function RegimePanel({
  regime,
  timelinePoints,
  timelineLoading,
  tickerSymbol,
  selectedModelDisplayName,
}: RegimePanelProps) {
  const education = REGIME_EDUCATION[regime.label];
  const frequency = timelinePoints
    ? computeRegimeFrequency(timelinePoints, regime.label, tickerSymbol)
    : null;

  return (
    <Card title="Market Regime">
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {REGIME_DISPLAY_LABEL[regime.label]}
      </p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {(regime.confidence * 100).toFixed(0)}% confidence in this classification
      </p>

      <div className="mt-4 space-y-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        <p>{education.whatItMeans}</p>
        <p>{education.investorExperience}</p>
        {frequency ? <p>{frequency.sentence}</p> : null}
        <p>
          {modelInfluenceSentence(
            REGIME_DISPLAY_LABEL[regime.label],
            selectedModelDisplayName,
            tickerSymbol,
          )}
        </p>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Regime history
        </p>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          Each colored band shows which market condition {tickerSymbol} was in at that time.
        </p>
        {timelineLoading ? (
          <Skeleton className="h-[90px] w-full rounded-lg" />
        ) : timelinePoints && timelinePoints.length > 0 ? (
          <RegimeTimelineChart points={timelinePoints} />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Not enough history yet.</p>
        )}
      </div>
    </Card>
  );
}
