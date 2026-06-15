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
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-panel)",
        backdropFilter: "blur(14px)",
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
        "@supports not (backdrop-filter: blur(1px))": {
          background: "var(--surface-solid)",
        },
        ...sx,
      }}
    />
  );
}
