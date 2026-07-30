import { HorizonSelector } from "@/components/layout/HorizonSelector";
import { Spinner } from "@/components/ui/Spinner";

interface HorizonBarProps {
  value: number;
  onChange: (days: number) => void;
  historyDays: number | null;
  tickerSymbol: string;
  refetching: boolean;
}

/** The single control that drives every forecast-dependent piece of the
 * dashboard below it — deliberately the most prominent control on the page,
 * not buried inside another card. */
export function HorizonBar({
  value,
  onChange,
  historyDays,
  tickerSymbol,
  refetching,
}: HorizonBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/[.06] bg-white px-6 py-4 shadow-sm dark:border-white/[.08] dark:bg-zinc-950">
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Forecast Time Horizon
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Controls every prediction, chart, and risk metric below
        </p>
      </div>
      <div className="flex items-center gap-3">
        {refetching ? (
          <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            <Spinner className="h-3.5 w-3.5" /> Updating…
          </span>
        ) : null}
        <HorizonSelector
          value={value}
          onChange={onChange}
          historyDays={historyDays}
          tickerSymbol={tickerSymbol}
        />
      </div>
    </div>
  );
}
