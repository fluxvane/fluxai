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
  Chip,
  Divider,
} from "@mui/material";
import {
  SendOutlined,
  StopOutlined,
  AutoAwesome,
  ContentCopyOutlined,
  RefreshOutlined,
  CheckOutlined,
} from "@mui/icons-material";
import { motion } from "framer-motion";
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

const STARTER_PROMPTS = [
  "What can you help me with?",
  "Compare React and Svelte for a new project",
  "Explain quantum entanglement like I am five",
  "Draft a polite follow-up email",
];

export default function ChatPage() {
  const { user } = useAuth();
  const chat = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chat.messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || chat.isStreaming) return;
    setInput("");
    await chat.send(content);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const isEmpty = chat.messages.length === 0;
  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <AppShell
      rightSlot={<ModelPicker value={chat.model} onChange={chat.setModel} />}
    >
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isEmpty ? (
          <EmptyHero
            name={firstName}
            onPrompt={(prompt) => {
              setInput(prompt);
              inputRef.current?.focus();
            }}
          />
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
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  <Typography variant="body2" color="error.main">
                    {chat.error}
                  </Typography>
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
            "linear-gradient(180deg, transparent 0%, rgba(9,9,11,0.85) 30%, rgba(9,9,11,0.98) 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Box sx={{ maxWidth: 780, mx: "auto" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 1,
              p: 1.25,
              borderRadius: 3,
              border: "1px solid rgba(161,161,170,0.15)",
              background: "rgba(24,24,27,0.7)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              transition: "all 0.2s",
              "&:focus-within": {
                borderColor: "rgba(139,92,246,0.5)",
                boxShadow: "0 8px 32px rgba(139,92,246,0.18)",
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
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: 15, px: 1.5, py: 0.5 },
              }}
              sx={{ flex: 1 }}
            />
            {chat.isStreaming ? (
              <Tooltip title="Stop generating">
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
                        ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                        : "rgba(161,161,170,0.08)",
                      color: input.trim() ? "white" : "text.secondary",
                      "&:hover": {
                        background: input.trim()
                          ? "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)"
                          : "rgba(161,161,170,0.14)",
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
              opacity: 0.7,
            }}
          >
            Flux AI · {chat.model || "no model"} · responses can be inaccurate
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
            background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(139,92,246,0.35)",
            mb: 3,
          }}
        >
          <AutoAwesome sx={{ color: "white", fontSize: 28 }} />
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
              "linear-gradient(135deg, #fafafa 0%, #a78bfa 50%, #ec4899 100%)",
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
          Pick a starter or just start typing. Anything goes.
        </Typography>
      </motion.div>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          justifyContent: "center",
          maxWidth: 560,
          mb: 5,
        }}
      >
        {STARTER_PROMPTS.map((p, i) => (
          <motion.div
            key={p}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
          >
            <Chip
              label={p}
              onClick={() => onPrompt(p)}
              sx={{
                height: 34,
                bgcolor: "rgba(161,161,170,0.08)",
                border: "1px solid rgba(161,161,170,0.12)",
                color: "text.primary",
                fontWeight: 500,
                fontSize: 13,
                cursor: "pointer",
                "&:hover": {
                  bgcolor: "rgba(139,92,246,0.10)",
                  borderColor: "rgba(139,92,246,0.4)",
                },
                transition: "all 0.15s",
              }}
            />
          </motion.div>
        ))}
      </Box>

      <Divider
        sx={{
          width: "100%",
          maxWidth: 560,
          mb: 2,
          borderColor: "rgba(161,161,170,0.08)",
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 1, fontSize: 11, letterSpacing: "0.08em" }}
        >
          TRY ONE OF THESE
        </Typography>
      </Divider>

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
            transition={{ delay: 0.35 + i * 0.06 }}
          >
            <Box
              onClick={() => onPrompt(s.prompt)}
              sx={{
                p: 1.75,
                borderRadius: 2.5,
                border: "1px solid rgba(161,161,170,0.10)",
                background: "rgba(24,24,27,0.4)",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.15s",
                height: "100%",
                "&:hover": {
                  borderColor: "rgba(139,92,246,0.35)",
                  background: "rgba(139,92,246,0.04)",
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
                <Typography sx={{ fontSize: 16, lineHeight: 1 }}>
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
            </Box>
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
            color: "#fff",
            boxShadow: "0 6px 18px rgba(124,58,237,0.30)",
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
          color: "white",
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
          <Box sx={{ display: "flex", alignItems: "flex-start" }}>
            <Markdown>{message.content}</Markdown>
            {isStreaming && <Cursor />}
          </Box>
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
            <Tooltip title={copied ? "Copied" : "Copy"}>
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

function Cursor() {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        width: "0.5em",
        height: "1.05em",
        background: "linear-gradient(180deg, #a78bfa 0%, #ec4899 100%)",
        borderRadius: 0.5,
        ml: 0.3,
        verticalAlign: "-0.16em",
        flexShrink: 0,
        animation: "flux-blink 1.05s steps(2) infinite",
      }}
    />
  );
}
