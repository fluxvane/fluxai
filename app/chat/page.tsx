"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Tooltip,
  Button,
  ButtonBase,
  Fab,
  Zoom,
} from "@mui/material";
import {
  SendOutlined,
  StopOutlined,
  AutoAwesome,
  ContentCopyOutlined,
  RefreshOutlined,
  CheckOutlined,
  KeyboardArrowDownRounded,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { useSnackbar } from "notistack";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import ModelPicker from "@/components/ModelPicker";
import Markdown from "@/components/Markdown";
import ThinkingPanel from "@/components/ThinkingPanel";
import type { ChatMessage } from "@/types/chat";

const SUGGESTIONS = [
  {
    icon: "💡",
    label: "Explain a concept",
    prompt: "Explain how transformer attention works in simple terms.",
  },
  {
    icon: "✍️",
    label: "Write something",
    prompt:
      "Write a short, evocative poem about a sunrise in a cyberpunk city.",
  },
  {
    icon: "🧑‍💻",
    label: "Debug my code",
    prompt: "Help me debug a TypeScript error: object is possibly undefined.",
  },
  {
    icon: "🧠",
    label: "Brainstorm ideas",
    prompt: "Give me 5 creative product names for an AI-powered design tool.",
  },
];

export default function ChatPage() {
  const { user } = useAuth();
  const chat = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // Whether the user is pinned to the bottom. While true, the view follows the
  // streaming response; once the user scrolls up to re-read, following stops so
  // we never yank them away mid-read.
  const atBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = atBottom;
    setShowJump(!atBottom);
  };

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = true;
    setShowJump(false);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  // Focus the composer when a chat opens or is reset (pointer devices only,
  // so phones don't pop the keyboard over the conversation).
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      inputRef.current?.focus();
    }
    atBottomRef.current = true;
    setShowJump(false);
  }, [chat.conversationId]);

  // Follow the answer as it streams. Instant (not smooth) so it keeps pace with
  // rapid token updates — smooth-scroll animations queue up and stall. Runs on
  // every message mutation (each token replaces the messages array reference).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !atBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [chat.messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || chat.isStreaming) return;
    setInput("");
    atBottomRef.current = true; // sending always re-pins to the bottom
    await chat.send(content);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Ignore Enter while an IME composition (e.g. CJK input) is in progress.
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void handleSend();
    } else if (event.key === "Escape" && chat.isStreaming) {
      event.preventDefault();
      chat.abort();
    }
  };

  const fillPrompt = (prompt: string) => {
    setInput(prompt);
    // Wait for the value to land, then focus with the caret at the end.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(prompt.length, prompt.length);
    });
  };

  const isEmpty = chat.messages.length === 0;
  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <AppShell
      rightSlot={<ModelPicker value={chat.model} onChange={chat.setModel} />}
    >
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isEmpty ? (
          <EmptyHero name={firstName} onPrompt={fillPrompt} />
        ) : (
          <Box
            sx={{
              maxWidth: 780,
              width: "100%",
              mx: "auto",
              px: { xs: 2, md: 4 },
              py: { xs: 3, md: 5 },
            }}
          >
            <Stack spacing={4}>
              {chat.messages.map((message, index) => {
                const isLast = index === chat.messages.length - 1;
                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLast={isLast}
                    isStreaming={
                      chat.isStreaming && isLast && message.role === "assistant"
                    }
                    onRegenerate={() => void chat.regenerate()}
                  />
                );
              })}
              {chat.error && (
                <Box
                  role="alert"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    display: "flex",
                    alignItems: { xs: "flex-start", sm: "center" },
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 1.5,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="error.light"
                    sx={{ flex: 1, wordBreak: "break-word" }}
                  >
                    {chat.error}
                  </Typography>
                  {!chat.isStreaming && (
                    <Button
                      size="small"
                      color="inherit"
                      startIcon={<RefreshOutlined sx={{ fontSize: 16 }} />}
                      onClick={() => void chat.regenerate()}
                      sx={{ flexShrink: 0, py: 0.5, px: 1.5 }}
                    >
                      Retry
                    </Button>
                  )}
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </Box>

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        sx={{
          position: "sticky",
          bottom: 0,
          px: { xs: 2, md: 4 },
          pb: { xs: 2, md: 3 },
          pt: 2,
          background:
            "linear-gradient(180deg, transparent 0%, rgba(11,15,10,0.85) 30%, rgba(11,15,10,0.98) 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Zoom in={showJump && !isEmpty}>
          <Fab
            size="small"
            aria-label="Jump to latest message"
            onClick={jumpToLatest}
            sx={{
              position: "absolute",
              top: -28,
              left: "50%",
              ml: "-20px",
              bgcolor: "var(--surface-solid)",
              color: "text.primary",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
              "&:hover": { bgcolor: "#1d2417" },
            }}
          >
            <KeyboardArrowDownRounded />
          </Fab>
        </Zoom>
        <Box sx={{ maxWidth: 780, mx: "auto" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 1,
              p: 1.25,
              borderRadius: 3,
              border: "1px solid rgba(163,172,160,0.15)",
              background: "rgba(21,27,17,0.7)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              transition: "all 0.2s",
              "&:focus-within": {
                borderColor: "rgba(118,185,0,0.5)",
                boxShadow: "0 8px 32px rgba(118,185,0,0.18)",
              },
            }}
          >
            <TextField
              inputRef={inputRef}
              multiline
              maxRows={8}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Flux AI…"
              fullWidth
              variant="standard"
              inputProps={{ "aria-label": "Message Flux AI" }}
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: 15, px: 1.5, py: 0.5 },
              }}
              sx={{ flex: 1 }}
            />
            {chat.isStreaming ? (
              <Tooltip title="Stop generating (Esc)">
                <IconButton
                  onClick={chat.abort}
                  sx={{
                    bgcolor: "error.main",
                    color: "white",
                    "&:hover": { bgcolor: "error.dark" },
                    width: 38,
                    height: 38,
                  }}
                >
                  <StopOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Send (Enter)">
                <span>
                  <IconButton
                    type="submit"
                    disabled={!input.trim()}
                    sx={{
                      background: input.trim()
                        ? "linear-gradient(135deg, #8ed100 0%, #76b900 100%)"
                        : "rgba(163,172,160,0.08)",
                      color: input.trim() ? "#0c1006" : "text.secondary",
                      "&:hover": {
                        background: input.trim()
                          ? "linear-gradient(135deg, #a3e635 0%, #8ed100 100%)"
                          : "rgba(163,172,160,0.14)",
                      },
                      width: 38,
                      height: 38,
                      transition: "all 0.2s",
                    }}
                  >
                    <SendOutlined sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 1.5,
              fontSize: 11,
              opacity: 0.8,
            }}
          >
            Flux AI · {chat.model || "no model"} · responses can be inaccurate
            <Box
              component="span"
              sx={{ display: { xs: "none", md: "inline" } }}
            >
              {" "}
              · Shift+Enter for a new line
            </Box>
          </Typography>
        </Box>
      </Box>
    </AppShell>
  );
}

function EmptyHero({
  name,
  onPrompt,
}: {
  name: string;
  onPrompt: (prompt: string) => void;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        px: 3,
        py: { xs: 6, md: 10 },
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2.5,
            background: "var(--gradient-brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(118,185,0,0.35)",
            mb: 3,
          }}
        >
          <AutoAwesome sx={{ color: "#0c1006", fontSize: 28 }} />
        </Box>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            letterSpacing: "-0.02em",
            fontSize: { xs: 30, md: 40 },
            lineHeight: 1.1,
            background:
              "linear-gradient(135deg, #f4f7f0 0%, #a3e635 55%, #76b900 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mb: 1.5,
          }}
        >
          Hello, {name}.
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ fontSize: 16, maxWidth: 460, mb: 5, mx: "auto" }}
        >
          Pick a starter below or just start typing.
        </Typography>
      </motion.div>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 1.25,
          width: "100%",
          maxWidth: 560,
        }}
      >
        {SUGGESTIONS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.06 }}
            style={{ height: "100%" }}
          >
            <ButtonBase
              onClick={() => onPrompt(s.prompt)}
              sx={{
                p: 1.75,
                borderRadius: 2.5,
                border: "1px solid rgba(163,172,160,0.10)",
                background: "rgba(21,27,17,0.4)",
                textAlign: "left",
                display: "block",
                width: "100%",
                transition: "all 0.15s",
                height: "100%",
                "&:hover, &.Mui-focusVisible": {
                  borderColor: "rgba(118,185,0,0.35)",
                  background: "rgba(118,185,0,0.04)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Stack
                direction="row"
                spacing={1.25}
                alignItems="center"
                sx={{ mb: 0.5 }}
              >
                <Typography sx={{ fontSize: 16, lineHeight: 1 }} aria-hidden>
                  {s.icon}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ fontSize: 13.5 }}
                >
                  {s.label}
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", fontSize: 12, lineHeight: 1.5 }}
              >
                {s.prompt}
              </Typography>
            </ButtonBase>
          </motion.div>
        ))}
      </Box>
    </Box>
  );
}

function MessageBubble({
  message,
  isLast,
  isStreaming,
  onRegenerate,
}: {
  message: ChatMessage;
  isLast: boolean;
  isStreaming: boolean;
  onRegenerate: () => void;
}) {
  const isUser = message.role === "user";
  const { enqueueSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      enqueueSnackbar("Couldn't copy to the clipboard.", { variant: "error" });
    }
  };

  // "Thinking" = streaming this assistant message but no answer text yet.
  const thinking = isStreaming && !message.content;

  // User messages: right-aligned gradient glass bubble, no avatar/header.
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ display: "flex", justifyContent: "flex-end" }}
      >
        <Box
          sx={{
            maxWidth: "80%",
            px: 1.9,
            py: 1.4,
            borderRadius: "16px 16px 4px 16px",
            background: "var(--gradient-brand)",
            color: "#0c1006",
            fontWeight: 500,
            boxShadow: "0 6px 18px rgba(118,185,0,0.25)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 14.5,
            lineHeight: 1.6,
          }}
        >
          {message.content}
        </Box>
      </motion.div>
    );
  }

  // Assistant messages: left-aligned editorial text with avatar + actions.
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "flex", gap: 12 }}
    >
      <Avatar
        sx={{
          width: 30,
          height: 30,
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          mt: 0.5,
          background: "var(--gradient-brand)",
          color: "#0c1006",
        }}
      >
        <AutoAwesome sx={{ fontSize: 16 }} />
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="baseline"
          sx={{ mb: 0.5 }}
        >
          <Typography
            variant="caption"
            fontWeight={600}
            color="text.primary"
            sx={{ fontSize: 13 }}
          >
            Flux AI
          </Typography>
          {message.model && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 11, fontFamily: "monospace" }}
            >
              · {message.model}
            </Typography>
          )}
        </Stack>

        <ThinkingPanel
          reasoning={message.reasoning ?? ""}
          isThinking={thinking}
        />

        {message.content ? (
          <Markdown streaming={isStreaming}>{message.content}</Markdown>
        ) : isStreaming && !message.reasoning ? (
          <TypingDots />
        ) : null}

        {!isStreaming && message.content && (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              mt: 0.75,
              opacity: 0.6,
              "&:hover": { opacity: 1 },
              transition: "opacity 0.15s",
            }}
          >
            <Tooltip title={copied ? "Copied" : "Copy response"}>
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{ color: "text.secondary", width: 28, height: 28 }}
              >
                {copied ? (
                  <CheckOutlined sx={{ fontSize: 14 }} />
                ) : (
                  <ContentCopyOutlined sx={{ fontSize: 14 }} />
                )}
              </IconButton>
            </Tooltip>
            {isLast && (
              <Tooltip title="Regenerate">
                <IconButton
                  size="small"
                  onClick={onRegenerate}
                  sx={{ color: "text.secondary", width: 28, height: 28 }}
                >
                  <RefreshOutlined sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
      </Box>
    </motion.div>
  );
}

// Three bouncing gradient dots shown while the assistant is composing its
// first token (the "responding" beat before text appears).
function TypingDots() {
  return (
    <Box
      role="status"
      sx={{ display: "flex", gap: 0.7, alignItems: "center", py: 0.75 }}
      aria-label="Flux AI is responding"
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          component="span"
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--gradient-brand)",
            animation: "flux-typing 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </Box>
  );
}
