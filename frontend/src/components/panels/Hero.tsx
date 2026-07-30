import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { formatCurrency, formatSignedPercent, truncateText } from "@/lib/interpret/format";

interface HeroProps {
  companyName: string;
  ticker: string;
  description: string | null;
  domain: string | null;
  currentPrice: number;
  todaysMove: number | null;
}

/** The first thing a visitor sees: who this company is, what they do, and
 * where the price stands right now — everything else on the page builds on
 * this context. */
export function Hero({
  companyName,
  ticker,
  description,
  domain,
  currentPrice,
  todaysMove,
}: HeroProps) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-black/[.06] bg-gradient-to-br from-white to-zinc-50 p-6 shadow-sm dark:border-white/[.08] dark:from-zinc-950 dark:to-zinc-900 sm:flex-row sm:items-start sm:justify-between sm:p-8">
      <div className="flex items-start gap-4">
        <CompanyLogo domain={domain} name={companyName} />
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {companyName}
            </h1>
            <span className="font-mono text-sm text-zinc-400 dark:text-zinc-500">{ticker}</span>
          </div>
          {description ? (
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {truncateText(description, 140)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="text-left sm:text-right">
        <p className="text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatCurrency(currentPrice)}
        </p>
        {todaysMove !== null ? (
          <p
            className={`text-sm font-medium tabular-nums ${
              todaysMove >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatSignedPercent(todaysMove)} today
          </p>
        ) : null}
      </div>
    </div>
  );
}
