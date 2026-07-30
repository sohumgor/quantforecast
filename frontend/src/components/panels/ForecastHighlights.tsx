import { formatCurrency } from "@/lib/interpret/format";

interface ForecastHighlightsProps {
  tickerSymbol: string;
  dateLabel: string;
  lowPrice: number;
  medianPrice: number;
  highPrice: number;
  currentPrice: number;
}

/** The three numbers everyone actually wants out of a fan chart, called out
 * as scannable stat blocks instead of buried in a sentence — median front
 * and center, worst/best case flanking it in matching risk colors. */
export function ForecastHighlights({
  tickerSymbol,
  dateLabel,
  lowPrice,
  medianPrice,
  highPrice,
  currentPrice,
}: ForecastHighlightsProps) {
  const medianChangePct = (medianPrice - currentPrice) / currentPrice;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <HighlightStat
          label="Worst Case"
          sub="Bottom 5% of outcomes"
          value={formatCurrency(lowPrice)}
          tone="red"
        />
        <HighlightStat
          label="Median Forecast"
          sub="Most likely outcome"
          value={formatCurrency(medianPrice)}
          tone="blue"
          emphasized
        />
        <HighlightStat
          label="Best Case"
          sub="Top 5% of outcomes"
          value={formatCurrency(highPrice)}
          tone="green"
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        By {dateLabel}, simulations point to a typical price near{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-50">
          {formatCurrency(medianPrice)}
        </span>{" "}
        for {tickerSymbol} ({medianChangePct >= 0 ? "up" : "down"}{" "}
        {Math.abs(medianChangePct * 100).toFixed(1)}% from today). In a pessimistic scenario
        (bottom 5% of simulated paths) the price could fall as low as{" "}
        <span className="font-medium text-red-700 dark:text-red-400">
          {formatCurrency(lowPrice)}
        </span>
        ; in an optimistic one (top 5%) it could climb as high as{" "}
        <span className="font-medium text-emerald-700 dark:text-emerald-400">
          {formatCurrency(highPrice)}
        </span>
        .
      </p>
    </div>
  );
}

type Tone = "red" | "blue" | "green";

const TONE_CLASSES: Record<Tone, string> = {
  red: "bg-red-50 dark:bg-red-950/30 ring-red-100 dark:ring-red-900/40",
  blue: "bg-blue-50 dark:bg-blue-950/30 ring-blue-200 dark:ring-blue-900/60",
  green: "bg-emerald-50 dark:bg-emerald-950/30 ring-emerald-100 dark:ring-emerald-900/40",
};

const LABEL_TONE_CLASSES: Record<Tone, string> = {
  red: "text-red-600 dark:text-red-400",
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-emerald-600 dark:text-emerald-400",
};

interface HighlightStatProps {
  label: string;
  sub: string;
  value: string;
  tone: Tone;
  emphasized?: boolean;
}

function HighlightStat({ label, sub, value, tone, emphasized = false }: HighlightStatProps) {
  return (
    <div
      className={`min-w-0 rounded-lg p-2.5 ring-1 sm:p-3.5 ${TONE_CLASSES[tone]} ${
        emphasized ? "ring-2" : ""
      }`}
    >
      <p
        className={`truncate text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${LABEL_TONE_CLASSES[tone]}`}
      >
        {label}
      </p>
      <p className="mt-1 break-words text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">{sub}</p>
    </div>
  );
}
