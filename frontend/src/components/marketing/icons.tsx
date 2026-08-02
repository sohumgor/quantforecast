import type { SVGProps } from "react";

/** Small stroke-icon set for the landing page only — deliberately hand-rolled
 * (matching the inline SVGs already used in DashboardShell/Modal) rather than
 * pulling in an icon library for a handful of glyphs. */
type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function TickerIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4.5h4.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function ForecastIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 17l4.5-5.5L12 15l4-6 4 3.5" />
      <path d="M17 8.5h3V11.5" />
      <ellipse cx="12" cy="19.5" rx="8" ry="1.7" opacity="0.5" />
    </svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5l8 4-8 4-8-4 8-4z" />
      <path d="M4 12.5l8 4 8-4" />
      <path d="M4 16.5l8 4 8-4" />
    </svg>
  );
}

export function RegimeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 12a9 9 0 1 1 9 9" />
      <path d="M12 7.5v4.5l3.2 1.9" />
      <path d="M3 12l2.2-1.3M3 12l1.1 2.4" />
    </svg>
  );
}

export function DiceIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <circle cx="8.3" cy="8.3" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.7" cy="8.3" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.3" cy="15.7" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.7" cy="15.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5l7 3v5.2c0 4.5-3 7.4-7 8.8-4-1.4-7-4.3-7-8.8V6.5l7-3z" />
      <path d="M9.2 12l2 2 3.6-4" />
    </svg>
  );
}

export function CpuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M9 3.5v2M15 3.5v2M9 18.5v2M15 18.5v2M3.5 9h2M3.5 15h2M18.5 9h2M18.5 15h2" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5h16v10.5H9.5L5 20v-4H4V5.5z" />
      <path d="M7.5 9.5h9M7.5 12.5h6" />
    </svg>
  );
}

export function CapIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 9.5L12 5l9.5 4.5L12 14 2.5 9.5z" />
      <path d="M6.5 11.5v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4" />
      <path d="M21 9.5v5" />
    </svg>
  );
}

export function BriefcaseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M8.5 8V6a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 6v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5l1.6 5.1 5.1 1.6-5.1 1.6-1.6 5.1-1.6-5.1-5.1-1.6 5.1-1.6L12 3.5z" />
      <path d="M18.5 15.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

export function CrossIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <path d="M4.5 12h15M13 6l6 6-6 6" />
    </svg>
  );
}
