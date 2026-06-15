import type { Variants, Transition } from "framer-motion";

/** House easing — matches --ease-out in globals.css. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const DUR = { fast: 0.16, base: 0.24, slow: 0.6 } as const;

/** Standard entrance: fade up. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE_OUT },
  },
};

/** Container that staggers its children's entrances. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

/** Snappy spring for functional micro-interactions (no overshoot in dense areas). */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
};

/** Per-page mount/exit used with AnimatePresence. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: DUR.fast, ease: EASE_OUT },
  },
};

/**
 * Returns variants stripped to opacity-only when the user prefers reduced
 * motion. Pass the boolean from framer-motion's useReducedMotion().
 */
export function respectMotion(variants: Variants, reduce: boolean): Variants {
  if (!reduce) return variants;
  const flat: Variants = {};
  for (const key of Object.keys(variants)) {
    const state = variants[key];
    if (state && typeof state === "object" && !Array.isArray(state)) {
      const { opacity, transition } = state as {
        opacity?: number;
        transition?: Transition;
      };
      flat[key] = {
        opacity: opacity ?? 1,
        transition: { duration: 0, ...transition },
      };
    } else {
      flat[key] = state;
    }
  }
  return flat;
}
