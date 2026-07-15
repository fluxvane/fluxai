"use client";

import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Collapse } from "@mui/material";
import {
  PsychologyOutlined,
  KeyboardArrowDownRounded,
} from "@mui/icons-material";

interface ThinkingPanelProps {
  reasoning: string;
  /** Model is actively reasoning (no answer text yet and still streaming). */
  isThinking: boolean;
}

export default function ThinkingPanel({
  reasoning,
  isThinking,
}: ThinkingPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const prevThinking = useRef(isThinking);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Auto-expand while thinking, auto-collapse once the thought completes.
  useEffect(() => {
    if (isThinking) setExpanded(true);
    else if (prevThinking.current && !isThinking) setExpanded(false);
    prevThinking.current = isThinking;
  }, [isThinking]);

  // Keep the live thought scrolled to the latest line. Deferred to the next
  // frame so rapid token updates don't force a synchronous reflow on each one.
  useEffect(() => {
    if (!isThinking || !expanded) return;
    const el = bodyRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [reasoning, isThinking, expanded]);

  if (!reasoning && !isThinking) return null;

  return (
    <Box sx={{ mb: 1.5, animation: "flux-fade-up 0.3s var(--ease-out) both" }}>
      <Box
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: isThinking
            ? "rgba(118,185,0,0.35)"
            : "rgba(163,172,160,0.14)",
          background: isThinking
            ? "linear-gradient(90deg, rgba(118,185,0,0.10), rgba(0,179,122,0.06))"
            : "rgba(163,172,160,0.04)",
          overflow: "hidden",
          transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s",
          // Static glow rather than an infinite box-shadow keyframe: animating
          // box-shadow repaints every frame; a fixed shadow is painted once.
          boxShadow: isThinking ? "0 0 20px -6px rgba(118,185,0,0.4)" : "none",
        }}
      >
        <Box
          onClick={() => setExpanded((e) => !e)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 1,
            cursor: "pointer",
            userSelect: "none",
            "&:hover": { background: "rgba(161,161,170,0.04)" },
          }}
        >
          <Box
            sx={{
              display: "flex",
              animation: isThinking
                ? "flux-pulse 1.6s ease-in-out infinite"
                : "none",
            }}
          >
            <PsychologyOutlined
              sx={{
                fontSize: 18,
                color: isThinking ? "primary.light" : "text.secondary",
              }}
            />
          </Box>

          {isThinking ? (
            <ShimmerLabel />
          ) : (
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, fontSize: 12.5, color: "text.secondary" }}
            >
              Thought process
            </Typography>
          )}

          <Box sx={{ flex: 1 }} />
          <Box
            sx={{
              display: "flex",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s var(--ease-out)",
            }}
          >
            <KeyboardArrowDownRounded
              sx={{ fontSize: 18, color: "text.secondary" }}
            />
          </Box>
        </Box>

        <Collapse in={expanded} timeout={250}>
          <Box
            ref={bodyRef}
            sx={{
              px: 1.75,
              pb: 1.5,
              pt: 0.5,
              maxHeight: isThinking ? 220 : 460,
              overflowY: "auto",
              borderTop: "1px solid rgba(161,161,170,0.08)",
            }}
          >
            <Typography
              component="div"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 13,
                lineHeight: 1.6,
                color: "text.secondary",
                fontFamily:
                  '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
                opacity: 0.92,
              }}
            >
              {reasoning}
              {isThinking && (
                <Box
                  component="span"
                  sx={{
                    display: "inline-block",
                    width: 7,
                    height: 14,
                    ml: 0.4,
                    verticalAlign: "-2px",
                    borderRadius: 0.5,
                    background: "linear-gradient(180deg,#a3e635,#76b900)",
                    animation: "flux-blink 1s steps(2) infinite",
                  }}
                />
              )}
            </Typography>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}

function ShimmerLabel() {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 600,
        fontSize: 12.5,
        background:
          "linear-gradient(90deg, #a1a1aa 25%, #fafafa 50%, #a1a1aa 75%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        animation: "flux-shimmer 1.6s linear infinite",
      }}
    >
      Thinking…
    </Typography>
  );
}
