import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { buildBacktestReliabilitySummary } from "@/lib/interpret/backtest";
import { formatPercent } from "@/lib/interpret/format";

interface BacktestReliabilityCardProps {
  modelDisplayName: string;
  tickerSymbol: string;
  nWindows: number;
  meanAbsolutePctError: number;
  coverage90: number;
  directionalAccuracy: number;
}

const LEVEL_BADGE_VARIANT: Record<string, BadgeVariant> = {
  Excellent: "good",
  Good: "good",
  Fair: "warning",
  Limited: "critical",
};

export function BacktestReliabilityCard({
  modelDisplayName,
  tickerSymbol,
  nWindows,
  meanAbsolutePctError,
  coverage90,
  directionalAccuracy,
}: BacktestReliabilityCardProps) {
  const summary = buildBacktestReliabilitySummary(
    modelDisplayName,
    tickerSymbol,
    nWindows,
    meanAbsolutePctError,
    coverage90,
    directionalAccuracy,
  );

  return (
    <Card title="How Reliable Was This Model?">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={LEVEL_BADGE_VARIANT[summary.level]} className="px-3 py-1 text-sm">
          {summary.level}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        {summary.paragraph}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        <Stat label="Rolling windows tested" value={String(nWindows)} />
        <Stat label="Typical forecast error" value={formatPercent(meanAbsolutePctError, 1)} />
        <Stat label="Landed in 90% range" value={formatPercent(coverage90)} sub="target: 90%" />
        <Stat
          label="Called direction right"
          value={formatPercent(directionalAccuracy)}
          sub="50% = coin flip"
        />
      </div>
    </Card>
  );
}
