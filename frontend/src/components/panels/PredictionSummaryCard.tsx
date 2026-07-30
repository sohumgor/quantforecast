import { Card } from "@/components/ui/Card";
import { buildForecastSummary } from "@/lib/interpret/forecast";

interface PredictionSummaryCardProps {
  tickerSymbol: string;
  horizonLabel: string;
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
  probPositiveReturn: number;
}

/** The Simple-Mode narrative card: one paragraph summarizing the forecast in
 * plain English. The numbers behind it live in the quick-stats row above. */
export function PredictionSummaryCard({
  tickerSymbol,
  horizonLabel,
  medianPrice,
  lowPrice,
  highPrice,
  probPositiveReturn,
}: PredictionSummaryCardProps) {
  const { paragraph } = buildForecastSummary({
    tickerSymbol,
    horizonLabel,
    medianPrice,
    lowPrice,
    highPrice,
    probPositiveReturn,
  });

  return (
    <Card title="Likely Price Range" subtitle={`Over the next ${horizonLabel.toLowerCase()}`}>
      <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">{paragraph}</p>
    </Card>
  );
}
