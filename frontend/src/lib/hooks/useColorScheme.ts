"use client";

import { useEffect, useState } from "react";

export function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    // Deliberately synchronous: `window.matchMedia` doesn't exist during SSR,
    // so the real value can only be read after mount. Deferring this one
    // extra render is the standard, hydration-safe way to read browser-only
    // state — not something a reducer or lazy initializer can avoid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefersDark(mql.matches);
    const handler = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return prefersDark;
}
