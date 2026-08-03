import { CheckIcon, CrossIcon } from "./icons";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const TRADITIONAL = ["One prediction", "Little explanation", "Generic indicators"];
const OURS = [
  "Thousands of simulations",
  "Probability-based forecasts",
  "Historical model validation",
  "Risk-aware analysis",
];

export function ComparisonSection() {
  return (
    <section className="flex flex-col gap-10 py-16 sm:py-20">
      <SectionHeading kicker="Why this is different" title="Not another single-number stock predictor" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl border border-black/[.06] bg-zinc-50/60 p-6 dark:border-white/[.08] dark:bg-zinc-900/40">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-600">
              Traditional stock sites
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {TRADITIONAL.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-zinc-500 dark:text-zinc-400"
                >
                  <CrossIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-400 dark:text-red-500/80" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="h-full rounded-2xl border border-zinc-900/10 bg-gradient-to-br from-white to-zinc-50 p-6 shadow-sm dark:border-white/[.12] dark:from-zinc-950 dark:to-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              QuantForecast
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {OURS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200"
                >
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
