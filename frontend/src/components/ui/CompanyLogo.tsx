"use client";

import Image from "next/image";
import { useState } from "react";

interface CompanyLogoProps {
  domain: string | null;
  name: string;
  size?: number;
}

/** Company logo via Clearbit's public logo API, falling back to a colored
 * letter-avatar when there's no domain or the image fails to load (not
 * every company resolves a logo there). */
export function CompanyLogo({ domain, name, size = 56 }: CompanyLogoProps) {
  const [errored, setErrored] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (!domain || errored) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
        aria-hidden="true"
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-black/[.06] dark:ring-white/[.08]"
    >
      <Image
        src={`https://logo.clearbit.com/${domain}`}
        alt={`${name} logo`}
        width={size}
        height={size}
        unoptimized
        className="h-full w-full object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}
