"use client";

import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Collapse } from "@mui/material";
import {
  PsychologyOutlined,
  KeyboardArrowDownRounded,
} from "@mui/icons-material";
import { motion } from "framer-motion";

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

  // Keep the live thought scrolled to the latest line.
  useEffect(() => {
    if (isThinking && expanded && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [reasoning, isThinking, expanded]);

  if (!reasoning && !isThinking) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ marginBottom: 12 }}
    >
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
          transition: "border-color 0.3s, background 0.3s",
          animation: isThinking
            ? "flux-think-glow 2.4s ease-in-out infinite"
            : "none",
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
          <motion.div
            animate={
              isThinking
                ? { rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }
                : { rotate: 0, scale: 1 }
            }
            transition={
              isThinking
                ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.2 }
            }
            style={{ display: "flex" }}
          >
            <PsychologyOutlined
              sx={{
                fontSize: 18,
                color: isThinking ? "primary.light" : "text.secondary",
              }}
            />
          </motion.div>

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
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: "flex" }}
          >
            <KeyboardArrowDownRounded
              sx={{ fontSize: 18, color: "text.secondary" }}
            />
          </motion.div>
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
    </motion.div>
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
