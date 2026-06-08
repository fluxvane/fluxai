'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Stack, Typography, TextField, IconButton, Avatar, Tooltip, CircularProgress,
  Button, Popover, Chip, Divider, InputAdornment,
} from '@mui/material';
import {
  SendOutlined, StopOutlined, AutoAwesome, ContentCopyOutlined, RefreshOutlined,
  CheckOutlined, SearchOutlined, KeyboardArrowDownOutlined,
} from '@mui/icons-material';
import { useChat } from '@/hooks/useChat';
import { useSettings } from '@/contexts/SettingsContext';
import AppShell from '@/components/AppShell';
import type { ChatMessage } from '@/types/chat';

const SUGGESTIONS = [
  { icon: '💡', label: 'Explain a concept', prompt: 'Explain how transformer attention works in simple terms.' },
  { icon: '✍️', label: 'Write something', prompt: 'Write a short, evocative poem about a sunrise in a cyberpunk city.' },
  { icon: '🧑‍💻', label: 'Debug my code', prompt: 'Help me debug a TypeScript error: object is possibly undefined.' },
  { icon: '🧠', label: 'Brainstorm ideas', prompt: 'Give me 5 creative product names for an AI-powered design tool.' },
];

const STARTER_PROMPTS = [
  'What can you help me with?',
  'Compare React and Svelte for a new project',
  'Summarize the last quarter results',
  'Draft a polite follow-up email',
];

export default function ChatPage() {
  const { settings, hasSettings, isLoaded } = useSettings();
  const chat = useChat();
  const [input, setInput] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<Array<{ id: string; provider?: string }>>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (settings) {
      setModel(settings.defaultModel);
    }
  }, [settings]);

  useEffect(() => {
    if (!settings) return;
    let cancelled = false;
    setModelsLoading(true);
    fetch('/api/proxy/models')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { data?: Array<{ id: string; provider?: string }> } | null) => {
        if (cancelled) return;
        if (data?.data) {
          setModels(data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [settings]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chat.messages]);

  if (!isLoaded) return null;
  if (!hasSettings || !settings) return null;

  const handleSend = async () => {
    const content = input.trim();
    if (!content || chat.isStreaming) return;
    setInput('');
    await chat.send(content);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleAbort = () => chat.abort();

  const isEmpty = chat.messages.length === 0;

  return (
    <AppShell
      rightSlot={
        <ModelPicker
          value={model}
          models={models}
          loading={modelsLoading}
          onChange={setModel}
        />
      }
    >
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isEmpty ? (
          <EmptyHero
            name={settings.name}
            onPrompt={(prompt) => {
              setInput(prompt);
              inputRef.current?.focus();
            }}
          />
        ) : (
          <Box sx={{ maxWidth: 760, width: '100%', mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>
            <Stack spacing={5}>
              {chat.messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  userName={settings.name}
                  isLast={index === chat.messages.length - 1}
                  isStreaming={chat.isStreaming && index === chat.messages.length - 1 && message.role === 'assistant'}
                  onRegenerate={async () => {
                    const lastUserIdx = [...chat.messages].reverse().findIndex((m) => m.role === 'user');
                    if (lastUserIdx === -1) return;
                    const userMessage = chat.messages[chat.messages.length - 1 - lastUserIdx];
                    chat.setMessages(chat.messages.slice(0, chat.messages.length - 1 - lastUserIdx));
                    setInput('');
                    await chat.send(userMessage.content);
                  }}
                />
              ))}
              {chat.error && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
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
        onSubmit={(e) => { e.preventDefault(); void handleSend(); }}
        sx={{
          position: 'sticky',
          bottom: 0,
          px: { xs: 2, md: 4 },
          pb: { xs: 2, md: 3 },
          pt: 2,
          background: 'linear-gradient(180deg, transparent 0%, rgba(9,9,11,0.85) 30%, rgba(9,9,11,0.98) 100%)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Box sx={{ maxWidth: 760, mx: 'auto' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 1,
              p: 1.25,
              borderRadius: 3,
              border: '1px solid rgba(161, 161, 170, 0.15)',
              background: 'rgba(24, 24, 27, 0.7)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
              transition: 'all 0.2s',
              '&:focus-within': {
                borderColor: 'rgba(139, 92, 246, 0.5)',
                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.18)',
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
              disabled={chat.isStreaming}
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: 15, px: 1.5, py: 0.5 },
              }}
              sx={{ flex: 1 }}
            />
            {chat.isStreaming ? (
              <Tooltip title="Stop generating">
                <IconButton
                  onClick={handleAbort}
                  sx={{
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'error.dark' },
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
                        ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                        : 'rgba(161, 161, 170, 0.08)',
                      color: input.trim() ? 'white' : 'text.secondary',
                      '&:hover': {
                        background: input.trim()
                          ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)'
                          : 'rgba(161, 161, 170, 0.14)',
                      },
                      width: 38,
                      height: 38,
                      transition: 'all 0.2s',
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
            sx={{ display: 'block', textAlign: 'center', mt: 1.5, fontSize: 11, opacity: 0.7 }}
          >
            Flux AI · {model || 'no model selected'} · your data stays in your browser
          </Typography>
        </Box>
      </Box>
    </AppShell>
  );
}

function EmptyHero({ name, onPrompt }: { name: string; onPrompt: (prompt: string) => void }) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
        py: { xs: 6, md: 10 },
        animation: 'fadeUp 0.5s ease-out',
        '@keyframes fadeUp': {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2.5,
          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(139,92,246,0.35)',
          mb: 3,
        }}
      >
        <AutoAwesome sx={{ color: 'white', fontSize: 28 }} />
      </Box>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 700,
          letterSpacing: '-0.02em',
          fontSize: { xs: 30, md: 40 },
          lineHeight: 1.1,
          background: 'linear-gradient(135deg, #fafafa 0%, #a78bfa 50%, #ec4899 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 1.5,
        }}
      >
        Hello, {name.split(' ')[0]}.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ fontSize: 16, maxWidth: 460, mb: 5 }}>
        Pick a starter or just start typing. Anything goes.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 560, mb: 5 }}>
        {STARTER_PROMPTS.map((p) => (
          <Chip
            key={p}
            label={p}
            onClick={() => onPrompt(p)}
            sx={{
              height: 34,
              bgcolor: 'rgba(161, 161, 170, 0.08)',
              border: '1px solid rgba(161, 161, 170, 0.12)',
              color: 'text.primary',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'rgba(139, 92, 246, 0.10)',
                borderColor: 'rgba(139, 92, 246, 0.4)',
              },
              transition: 'all 0.15s',
            }}
          />
        ))}
      </Box>

      <Divider sx={{ width: '100%', maxWidth: 560, mb: 2, borderColor: 'rgba(161, 161, 170, 0.08)' }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontSize: 11, letterSpacing: '0.08em' }}>
          TRY ONE OF THESE
        </Typography>
      </Divider>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25, width: '100%', maxWidth: 560 }}>
        {SUGGESTIONS.map((s, i) => (
          <Box
            key={s.label}
            onClick={() => onPrompt(s.prompt)}
            sx={{
              p: 1.75,
              borderRadius: 2.5,
              border: '1px solid rgba(161, 161, 170, 0.10)',
              background: 'rgba(24, 24, 27, 0.4)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s',
              animation: `fadeUp 0.5s ease-out ${0.1 + i * 0.06}s both`,
              '&:hover': {
                borderColor: 'rgba(139, 92, 246, 0.35)',
                background: 'rgba(139, 92, 246, 0.04)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 16, lineHeight: 1 }}>{s.icon}</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13.5 }}>
                {s.label}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 12, lineHeight: 1.5 }}>
              {s.prompt}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function MessageBubble({
  message, userName, isLast, isStreaming, onRegenerate,
}: {
  message: ChatMessage;
  userName: string;
  isLast: boolean;
  isStreaming: boolean;
  onRegenerate: () => Promise<void>;
}) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        flexDirection: 'row',
        animation: 'fadeIn 0.25s ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Avatar
        sx={{
          width: 30,
          height: 30,
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          mt: 0.5,
          background: isUser
            ? 'rgba(161, 161, 170, 0.12)'
            : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          color: isUser ? 'text.primary' : 'white',
        }}
      >
        {isUser
          ? userName.trim().charAt(0).toUpperCase() || 'U'
          : <AutoAwesome sx={{ fontSize: 16 }} />}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 0.5 }}>
          <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ fontSize: 13 }}>
            {isUser ? userName : 'Flux AI'}
          </Typography>
          {!isUser && message.model && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              · {message.model}
            </Typography>
          )}
        </Stack>

        <Box
          sx={{
            p: 1.75,
            borderRadius: 2,
            background: isUser
              ? 'rgba(139, 92, 246, 0.10)'
              : 'transparent',
            border: isUser
              ? '1px solid rgba(139, 92, 246, 0.22)'
              : 'none',
            borderLeft: isUser ? 'none' : '2px solid rgba(139, 92, 246, 0.35)',
          }}
        >
          <Typography
            component="div"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 14.5,
              lineHeight: 1.65,
              color: 'text.primary',
            }}
          >
            {message.content || (isStreaming ? '' : ' ')}
            {isStreaming && <Cursor />}
          </Typography>
        </Box>

        {!isUser && !isStreaming && message.content && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, opacity: 0.6, '&:hover': { opacity: 1 }, transition: 'opacity 0.15s' }}>
            <Tooltip title={copied ? 'Copied' : 'Copy'}>
              <IconButton size="small" onClick={handleCopy} sx={{ color: 'text.secondary', width: 28, height: 28 }}>
                {copied ? <CheckOutlined sx={{ fontSize: 14 }} /> : <ContentCopyOutlined sx={{ fontSize: 14 }} />}
              </IconButton>
            </Tooltip>
            {isLast && (
              <Tooltip title="Regenerate">
                <IconButton size="small" onClick={() => void onRegenerate()} sx={{ color: 'text.secondary', width: 28, height: 28 }}>
                  <RefreshOutlined sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function Cursor() {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: '0.55em',
        height: '1.1em',
        background: 'linear-gradient(180deg, #a78bfa 0%, #ec4899 100%)',
        borderRadius: 0.5,
        ml: 0.3,
        verticalAlign: '-0.18em',
        animation: 'blink 1.05s steps(2) infinite',
        '@keyframes blink': {
          '0%, 50%': { opacity: 1 },
          '50.01%, 100%': { opacity: 0 },
        },
      }}
    />
  );
}

interface ModelItem {
  id: string;
  provider?: string;
}

function ModelPicker({
  value, models, loading, onChange,
}: {
  value: string;
  models: ModelItem[];
  loading: boolean;
  onChange: (next: string) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [filter, setFilter] = useState('');
  const open = Boolean(anchorEl);

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? models.filter((m) => m.id.toLowerCase().includes(q) || (m.provider ?? '').toLowerCase().includes(q))
      : models;

    const groups: Record<string, ModelItem[]> = {};
    for (const m of filtered) {
      const key = m.provider ?? m.id.split('/')[0] ?? 'other';
      (groups[key] ||= []).push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [models, filter]);

  const handleClose = () => {
    setAnchorEl(null);
    setFilter('');
  };

  const displayValue = value || 'Select model';
  const displayProvider = value ? value.split('/')[0] : null;

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={loading}
        startIcon={
          loading ? (
            <CircularProgress size={12} sx={{ color: 'text.secondary' }} />
          ) : (
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'success.main',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
              }}
            />
          )
        }
        endIcon={<KeyboardArrowDownOutlined sx={{ fontSize: 16, opacity: 0.6 }} />}
        sx={{
          color: 'text.primary',
          bgcolor: 'rgba(161, 161, 170, 0.08)',
          border: '1px solid rgba(161, 161, 170, 0.12)',
          borderRadius: 2,
          px: 1.5,
          py: 0.5,
          minHeight: 36,
          fontSize: 13,
          fontWeight: 500,
          textTransform: 'none',
          maxWidth: 260,
          justifyContent: 'flex-start',
          '&:hover': { bgcolor: 'rgba(161, 161, 170, 0.14)' },
        }}
      >
        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
          {displayValue}
        </Box>
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 380,
              maxHeight: 540,
              background: 'rgba(20, 20, 23, 0.96)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(161, 161, 170, 0.12)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              borderRadius: 2.5,
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(161, 161, 170, 0.08)' }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Search models…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: { fontSize: 14, bgcolor: 'rgba(161, 161, 170, 0.06)' },
            }}
          />
          {displayProvider && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontSize: 11 }}>
              Current: <Box component="span" sx={{ color: 'primary.light', fontFamily: 'monospace' }}>{value}</Box>
            </Typography>
          )}
        </Box>

        <Box sx={{ overflowY: 'auto', maxHeight: 440 }}>
          {loading && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={20} />
            </Box>
          )}
          {!loading && grouped.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                No models match &ldquo;{filter}&rdquo;
              </Typography>
            </Box>
          )}
          {!loading && grouped.map(([provider, items]) => (
            <Box key={provider}>
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  position: 'sticky',
                  top: 0,
                  background: 'rgba(20, 20, 23, 0.95)',
                  backdropFilter: 'blur(8px)',
                  borderBottom: '1px solid rgba(161, 161, 170, 0.05)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  {provider} <Box component="span" sx={{ opacity: 0.5 }}>· {items.length}</Box>
                </Typography>
              </Box>
              {items.map((m) => {
                const selected = m.id === value;
                return (
                  <Box
                    key={m.id}
                    onClick={() => { onChange(m.id); handleClose(); }}
                    sx={{
                      px: 2,
                      py: 0.85,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      background: selected ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                      borderLeft: selected ? '2px solid' : '2px solid transparent',
                      borderColor: selected ? 'primary.light' : 'transparent',
                      '&:hover': {
                        background: selected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(161, 161, 170, 0.05)',
                      },
                      transition: 'background 0.1s',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        fontFamily: '"JetBrains Mono", "SF Mono", monospace',
                        color: 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {m.id}
                    </Typography>
                    {selected && <CheckOutlined sx={{ fontSize: 16, color: 'primary.light', flexShrink: 0 }} />}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}
