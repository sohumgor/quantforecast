import type { RiskAnalyticsInfo } from "@shared/types";

import { VaRGauge } from "@/components/charts/VaRGauge";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { buildRiskSummary } from "@/lib/interpret/risk";

interface RiskSummaryCardProps {
  risk: RiskAnalyticsInfo;
  currentPrice: number;
  tickerSymbol: string;
  dailyVolPct: number | null;
}

const LEVEL_BADGE_VARIANT: Record<string, BadgeVariant> = {
  Low: "good",
  Moderate: "warning",
  High: "critical",
};

export function RiskSummaryCard({
  risk,
  currentPrice,
  tickerSymbol,
  dailyVolPct,
}: RiskSummaryCardProps) {
  const summary = buildRiskSummary(risk, currentPrice, tickerSymbol, dailyVolPct);

  return (
    <Card title="Risk Summary">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={LEVEL_BADGE_VARIANT[summary.level]} className="px-3 py-1 text-sm">
          {summary.level} Risk
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        {summary.levelExplanation}
      </p>

      <div className="mt-2">
        <VaRGauge valueAtRisk95={risk.value_at_risk_95} />
      </div>

      <div className="mt-2 space-y-4">
        {summary.items.map((item) => (
          <div key={item.label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {item.label}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {item.interpretation}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
