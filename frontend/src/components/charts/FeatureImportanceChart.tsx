import type { FeatureRow } from "@shared/types";

import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/tooltip/InfoTooltip";
import {
  computeFeaturePercentiles,
  FEATURE_GLOSSARY_KEYS,
  percentileDescriptor,
  type PercentileDescriptor,
} from "@/lib/interpret/features";

interface FeatureImportanceChartProps {
  rows: FeatureRow[];
}

const TONE_BADGE_VARIANT: Record<PercentileDescriptor["tone"], BadgeVariant> = {
  low: "warning",
  typical: "muted",
  high: "warning",
};

const TONE_MARKER_CLASS: Record<PercentileDescriptor["tone"], string> = {
  low: "bg-amber-500",
  typical: "bg-zinc-400 dark:bg-zinc-500",
  high: "bg-amber-500",
};

/** Where the latest value of each regime-driving feature sits relative to
 * its own historical distribution, framed in plain English rather than raw
 * percentiles — "higher than usual" reads instantly, "84th percentile"
 * doesn't. Each row pairs a plain-English verdict with a small gauge so the
 * number is there for anyone who wants it, without being the headline. */
export function FeatureImportanceChart({ rows }: FeatureImportanceChartProps) {
  const entries = computeFeaturePercentiles(rows);

  if (entries.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Not enough history yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry) => {
        const descriptor = percentileDescriptor(entry.percentile);
        return (
          <div key={entry.key}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {entry.label}
                </p>
                <InfoTooltip metricKey={FEATURE_GLOSSARY_KEYS[entry.key]} />
              </div>
              <Badge variant={TONE_BADGE_VARIANT[descriptor.tone]}>{descriptor.label}</Badge>
            </div>
            <div className="relative mt-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-zinc-300 dark:bg-zinc-600"
              />
              <div
                className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full ring-2 ring-white dark:ring-zinc-950 ${TONE_MARKER_CLASS[descriptor.tone]}`}
                style={{ left: `${Math.min(100, Math.max(0, entry.percentile))}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-zinc-400 dark:text-zinc-600">
              <span>Lower than usual</span>
              <span>Typical</span>
              <span>Higher than usual</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
