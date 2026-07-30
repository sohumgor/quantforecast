import type { ReactNode } from "react";

export type BadgeVariant = "default" | "good" | "warning" | "serious" | "critical" | "muted";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  good: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
  serious: "bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-400",
  critical: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  muted:
    "bg-transparent text-zinc-500 ring-1 ring-inset ring-zinc-200 dark:text-zinc-400 dark:ring-zinc-700",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
