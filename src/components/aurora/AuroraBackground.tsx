"use client";

import { useReducedMotion } from "framer-motion";

/**
 * Fixed, behind-everything animated mesh-glow canvas. Renders once at the
 * shell level. Never intercepts pointer events (z-index:-1, pointer-events:none
 * via .aurora-bg). Degrades to static gradients under reduced-motion.
 */
export default function AuroraBackground() {
  const reduce = useReducedMotion();
  return (
    <div
      className="aurora-bg"
      data-static={reduce ? "true" : undefined}
      aria-hidden
    >
      <div className="aurora-bg__mesh aurora-bg__mesh--violet" />
      <div className="aurora-bg__mesh aurora-bg__mesh--pink" />
      <div className="aurora-bg__grain" />
    </div>
  );
}
