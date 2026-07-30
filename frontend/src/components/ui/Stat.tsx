interface StatProps {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}

export function Stat({ label, value, sub, emphasis = false }: StatProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 ${
          emphasis ? "text-3xl" : "text-xl"
        }`}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p> : null}
    </div>
  );
}
