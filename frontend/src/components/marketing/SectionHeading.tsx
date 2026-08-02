interface SectionHeadingProps {
  kicker?: string;
  title: string;
  subtitle?: string;
}

export function SectionHeading({ kicker, title, subtitle }: SectionHeadingProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {kicker ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
          {kicker}
        </span>
      ) : null}
      <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-base">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
