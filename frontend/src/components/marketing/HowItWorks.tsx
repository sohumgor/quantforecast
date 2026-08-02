import { ForecastIcon, HistoryIcon, TickerIcon } from "./icons";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const STEPS = [
  {
    icon: TickerIcon,
    title: "Enter any ticker",
    description: "Type a stock, ETF, or index symbol — no account or setup required.",
  },
  {
    icon: HistoryIcon,
    title: "We analyze its history",
    description:
      "Historical prices are backtested across multiple models to find which one actually fits this ticker.",
  },
  {
    icon: ForecastIcon,
    title: "Get a probability-based forecast",
    description: "Thousands of simulated paths become a clear range of outcomes, not a single guess.",
  },
];

export function HowItWorks() {
  return (
    <section className="flex flex-col gap-10 py-16 sm:py-20">
      <SectionHeading kicker="How it works" title="From ticker to forecast in three steps" />
      <div className="grid grid-cols-3 gap-2 sm:gap-5">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 90}>
            <div className="group flex h-full flex-col rounded-lg border border-black/[.06] bg-white p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:rounded-2xl sm:p-6 dark:border-white/[.08] dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10 sm:rounded-xl dark:bg-zinc-50 dark:text-zinc-900">
                  <step.icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                </span>
                <span className="hidden font-mono text-xs text-zinc-300 sm:inline dark:text-zinc-700">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-2 text-[11px] font-semibold leading-snug text-zinc-900 sm:mt-4 sm:text-base dark:text-zinc-50">
                {step.title}
              </h3>
              <p className="mt-1 text-[10px] leading-snug text-zinc-500 sm:mt-1.5 sm:text-sm sm:leading-relaxed dark:text-zinc-400">
                {step.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
