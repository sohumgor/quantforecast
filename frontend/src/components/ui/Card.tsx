import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({ children, className = "", title, subtitle, action }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-black/[.06] bg-white shadow-sm dark:border-white/[.08] dark:bg-zinc-950 ${className}`}
    >
      {(title ?? action) ? (
        <div className="flex items-start justify-between gap-4 border-b border-black/[.06] px-6 py-5 dark:border-white/[.08]">
          <div>
            {title ? (
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="p-6">{children}</div>
    </div>
  );
}
