import { BriefcaseIcon, CapIcon, SparkIcon } from "./icons";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const AUDIENCES = [
  {
    icon: CapIcon,
    title: "Students learning investing",
    description: "See how real forecasting models behave on real tickers, without having to code them yourself.",
  },
  {
    icon: BriefcaseIcon,
    title: "Individual investors",
    description: "Get a probability-weighted view of a position's risk before you decide how much of it to hold.",
  },
  {
    icon: SparkIcon,
    title: "Finance enthusiasts",
    description: "Explore regime detection, volatility modeling, and Monte Carlo methods on any ticker you're curious about.",
  },
];

export function WhoIsThisFor() {
  return (
    <section className="flex flex-col gap-10 py-16 sm:py-20">
      <SectionHeading kicker="Who is this for" title="Built for anyone who wants the numbers, not a hunch" />
      <div className="grid grid-cols-3 gap-2 sm:gap-8">
        {AUDIENCES.map((audience, i) => (
          <Reveal key={audience.title} delay={i * 90}>
            <div className="flex flex-col items-center gap-1.5 text-center sm:gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 sm:h-11 sm:w-11 dark:bg-zinc-900 dark:text-zinc-300">
                <audience.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <h3 className="text-[11px] font-semibold leading-snug text-zinc-900 sm:text-base dark:text-zinc-50">
                {audience.title}
              </h3>
              <p className="max-w-xs text-[10px] leading-snug text-zinc-500 sm:text-sm sm:leading-relaxed dark:text-zinc-400">
                {audience.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
