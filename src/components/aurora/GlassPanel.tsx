"use client";

import { Box, type BoxProps } from "@mui/material";

interface GlassPanelProps extends BoxProps {
  /** Adds a hover lift + border brighten. Use on clickable cards only. */
  hover?: boolean;
}

/** Reusable frosted surface aligned to Aurora tokens. */
export default function GlassPanel({ hover, sx, ...rest }: GlassPanelProps) {
  return (
    <Box
      {...rest}
      sx={{
        // Near-opaque tint rather than backdrop-filter: on a dark theme this
        // reads as the same frosted surface, but avoids the per-frame re-blur
        // cost when the panel overlays the animated particle background.
        background: "rgba(22,28,17,0.86)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-panel)",
        boxShadow: "var(--shadow-card)",
        transition:
          "transform var(--dur-base) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
        ...(hover && {
          cursor: "pointer",
          "&:hover": {
            transform: "translateY(-3px)",
            borderColor: "var(--border-strong)",
          },
        }),
        ...sx,
      }}
    />
  );
}
