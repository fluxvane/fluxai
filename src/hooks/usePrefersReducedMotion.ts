"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Native replacement for framer-motion's useReducedMotion: tracks the user's
 * OS "reduce motion" setting via matchMedia, with no animation-library
 * dependency. SSR-safe (defaults to false until mounted).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return; // jsdom / unsupported
    const mql = window.matchMedia(QUERY);
    setReduce(mql.matches);
    const onChange = () => setReduce(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduce;
}
