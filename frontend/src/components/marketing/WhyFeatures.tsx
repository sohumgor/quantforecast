import { ChatIcon, CpuIcon, DiceIcon, LayersIcon, RegimeIcon, ShieldIcon } from "./icons";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const FEATURES = [
  {
    icon: LayersIcon,
    title: "Multiple forecasting models",
    description: "GARCH, EGARCH, and Geometric Brownian Motion — each suited to a different kind of market behavior.",
  },
  {
    icon: RegimeIcon,
    title: "Market regime detection",
    description: "Identifies whether a ticker is currently calm, trending, or volatile before a model is chosen.",
  },
  {
    icon: DiceIcon,
    title: "Monte Carlo simulations",
    description: "Thousands of simulated price paths turn one guess into a full distribution of plausible outcomes.",
  },
  {
    icon: ShieldIcon,
    title: "Risk analysis",
    description: "Value-at-risk, expected shortfall, and drawdown — quantified, not eyeballed.",
  },
  {
    icon: CpuIcon,
    title: "Automatic model selection",
    description: "Every ticker is backtested against its own history so the best-fit model is picked for it automatically.",
  },
  {
    icon: ChatIcon,
    title: "Plain-English explanations",
    description: "Every chart and number ships with a one-sentence explanation of what it actually means.",
  },
];

export function WhyFeatures() {
  return (
    <section className="flex flex-col gap-10 py-16 sm:py-20">
      <SectionHeading
        kicker="Why MarketLens"
        title="Built like a research desk, not a stock-tip site"
      />
      <div className="grid grid-cols-3 gap-2 sm:gap-5">
        {FEATURES.map((feature, i) => (
          <Reveal key={feature.title} delay={(i % 3) * 90}>
            <div className="group flex h-full flex-col rounded-lg border border-black/[.06] bg-white p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-black/[.1] hover:shadow-md sm:rounded-2xl sm:p-6 dark:border-white/[.08] dark:bg-zinc-950 dark:hover:border-white/[.14]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition-colors duration-300 group-hover:bg-zinc-900 group-hover:text-white sm:h-10 sm:w-10 sm:rounded-xl dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:bg-zinc-50 dark:group-hover:text-zinc-900">
                <feature.icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              </span>
              <h3 className="mt-2 text-[11px] font-semibold leading-snug text-zinc-900 sm:mt-4 sm:text-base dark:text-zinc-50">
                {feature.title}
              </h3>
              <p className="mt-1 text-[10px] leading-snug text-zinc-500 sm:mt-1.5 sm:text-sm sm:leading-relaxed dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
