'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Stack, Typography, TextField, IconButton, Avatar, Tooltip, CircularProgress,
  Button,
} from '@mui/material';
import {
  SendOutlined, StopOutlined, AutoAwesome, BoltOutlined, ContentCopyOutlined, RefreshOutlined,
  HubOutlined, CheckOutlined, PersonOutline, AddOutlined,
} from '@mui/icons-material';
import { useChat } from '@/hooks/useChat';
import { useSettings } from '@/contexts/SettingsContext';
import AppShell from '@/components/AppShell';
import type { ChatMessage } from '@/types/chat';

const SUGGESTIONS = [
  { icon: <BoltOutlined />, label: 'Explain quantum computing', prompt: 'Explain quantum computing in simple terms that a 10-year-old could understand.' },
  { icon: <AutoAwesome />, label: 'Write a poem', prompt: 'Write a short, evocative poem about a sunrise in a cyberpunk city.' },
  { icon: <HubOutlined />, label: 'Debug my code', prompt: 'Help me debug a TypeScript error: "Type \'undefined\' is not assignable to type \'string\'".' },
  { icon: <AddOutlined />, label: 'Brainstorm ideas', prompt: 'Give me 5 creative product names for an AI-powered design tool.' },
];

export default function ChatPage() {
  const { settings, hasSettings, isLoaded } = useSettings();
  const chat = useChat();
  const [input, setInput] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<Array<{ id: string }>>([]);
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
      .then((data: { data?: Array<{ id: string }> } | null) => {
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
        <Stack direction="row" spacing={1} alignItems="center">
          <ModelPicker
            value={model}
            options={models.map((m) => m.id)}
            loading={modelsLoading}
            onChange={setModel}
          />
        </Stack>
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
            onSuggestion={(prompt) => {
              setInput(prompt);
              inputRef.current?.focus();
            }}
          />
        ) : (
          <Box sx={{ maxWidth: 800, width: '100%', mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
            <Stack spacing={4}>
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
          pb: 3,
          pt: 2,
          background: 'linear-gradient(180deg, transparent 0%, rgba(9,9,11,0.85) 30%, rgba(9,9,11,0.95) 100%)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 1,
              p: 1.5,
              borderRadius: 3,
              border: '1px solid rgba(161, 161, 170, 0.15)',
              background: 'rgba(24, 24, 27, 0.7)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:focus-within': {
                borderColor: 'rgba(139, 92, 246, 0.5)',
                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.2)',
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
              placeholder={`Message Flux AI · ${model || 'select model'}`}
              fullWidth
              variant="standard"
              disabled={chat.isStreaming}
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: 15, px: 1, py: 0.5 },
              }}
              sx={{ flex: 1 }}
            />
            {chat.isStreaming ? (
              <Tooltip title="Stop">
                <IconButton
                  onClick={handleAbort}
                  sx={{
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'error.dark' },
                    width: 40,
                    height: 40,
                  }}
                >
                  <StopOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Send">
                <span>
                  <IconButton
                    type="submit"
                    disabled={!input.trim()}
                    sx={{
                      background: input.trim()
                        ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                        : 'rgba(161, 161, 170, 0.1)',
                      color: input.trim() ? 'white' : 'text.secondary',
                      '&:hover': {
                        background: input.trim()
                          ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)'
                          : 'rgba(161, 161, 170, 0.15)',
                      },
                      width: 40,
                      height: 40,
                      transition: 'all 0.2s',
                    }}
                  >
                    <SendOutlined sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5, fontSize: 11 }}>
            Flux AI · streaming via your proxy · your data stays in your browser
          </Typography>
        </Box>
      </Box>
    </AppShell>
  );
}

function EmptyHero({ name, onSuggestion }: { name: string; onSuggestion: (prompt: string) => void }) {
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
        py: 8,
        animation: 'fadeUp 0.6s ease-out',
        '@keyframes fadeUp': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(139,92,246,0.35)',
          mb: 3,
          animation: 'float 4s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-8px)' },
          },
        }}
      >
        <AutoAwesome sx={{ color: 'white', fontSize: 32 }} />
      </Box>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 700,
          letterSpacing: '-0.02em',
          fontSize: { xs: 32, md: 44 },
          background: 'linear-gradient(135deg, #fafafa 0%, #a78bfa 50%, #ec4899 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 1.5,
        }}
      >
        Hello, {name.split(' ')[0]}.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ fontSize: 17, maxWidth: 500, mb: 5 }}>
        How can I help you today?
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, width: '100%', maxWidth: 640 }}>
        {SUGGESTIONS.map((s, i) => (
          <Box
            key={s.label}
            onClick={() => onSuggestion(s.prompt)}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid rgba(161, 161, 170, 0.1)',
              background: 'rgba(24, 24, 27, 0.4)',
              backdropFilter: 'blur(8px)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              animation: `fadeUp 0.6s ease-out ${0.1 + i * 0.08}s both`,
              '&:hover': {
                borderColor: 'rgba(139, 92, 246, 0.4)',
                background: 'rgba(139, 92, 246, 0.05)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ color: 'primary.light', display: 'flex' }}>{s.icon}</Box>
              <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}>
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
        gap: 2,
        flexDirection: isUser ? 'row-reverse' : 'row',
        animation: 'fadeIn 0.3s ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          fontSize: 14,
          fontWeight: 700,
          mt: 0.5,
          background: isUser
            ? 'rgba(161, 161, 170, 0.15)'
            : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          color: isUser ? 'text.primary' : 'white',
        }}
      >
        {isUser ? <PersonOutline sx={{ fontSize: 18 }} /> : <AutoAwesome sx={{ fontSize: 16 }} />}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0, maxWidth: '85%' }}>
        <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 0.5, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
          <Typography variant="caption" fontWeight={600} color="text.primary">
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
            p: 2,
            borderRadius: 3,
            background: isUser
              ? 'rgba(139, 92, 246, 0.12)'
              : 'rgba(24, 24, 27, 0.6)',
            border: isUser
              ? '1px solid rgba(139, 92, 246, 0.25)'
              : '1px solid rgba(161, 161, 170, 0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Typography
            component="div"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 15,
              lineHeight: 1.7,
              color: 'text.primary',
            }}
          >
            {message.content || (isStreaming ? '' : ' ')}
            {isStreaming && <Cursor />}
          </Typography>
        </Box>

        {!isUser && !isStreaming && message.content && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1, opacity: 0.7 }}>
            <Tooltip title={copied ? 'Copied' : 'Copy'}>
              <IconButton size="small" onClick={handleCopy} sx={{ color: 'text.secondary' }}>
                {copied ? <CheckOutlined sx={{ fontSize: 16 }} /> : <ContentCopyOutlined sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
            {isLast && (
              <Tooltip title="Regenerate">
                <IconButton size="small" onClick={() => void onRegenerate()} sx={{ color: 'text.secondary' }}>
                  <RefreshOutlined sx={{ fontSize: 16 }} />
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
        verticalAlign: '-0.15em',
        animation: 'blink 1s steps(1) infinite',
        '@keyframes blink': {
          '0%, 50%': { opacity: 1 },
          '50.01%, 100%': { opacity: 0 },
        },
      }}
    />
  );
}

function ModelPicker({
  value, options, loading, onChange,
}: {
  value: string;
  options: string[];
  loading: boolean;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const filtered = useMemo(() => {
    if (!filter) return options;
    const q = filter.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, filter]);

  return (
    <>
      <Button
        ref={anchorRef}
        onClick={() => setOpen(true)}
        startIcon={loading ? <CircularProgress size={12} /> : <BoltOutlined sx={{ fontSize: 16 }} />}
        endIcon={<Box component="span" sx={{ fontSize: 10, opacity: 0.6 }}>▾</Box>}
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
          '&:hover': { bgcolor: 'rgba(161, 161, 170, 0.14)' },
        }}
      >
        {value || 'Select model'}
      </Button>
      {open && (
        <Box
          onClick={() => setOpen(false)}
          sx={{ position: 'fixed', inset: 0, zIndex: 1300 }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: 'absolute',
              top: anchorRef.current?.getBoundingClientRect().bottom ?? 60,
              right: 16,
              width: 360,
              maxHeight: 480,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              background: 'rgba(24, 24, 27, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(161, 161, 170, 0.15)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
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
                sx={{ '& .MuiOutlinedInput-root': { fontSize: 14 } }}
              />
            </Box>
            <Box sx={{ overflowY: 'auto', flex: 1, py: 0.5 }}>
              {loading && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <CircularProgress size={20} />
                </Box>
              )}
              {!loading && filtered.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  No models match &ldquo;{filter}&rdquo;
                </Typography>
              )}
              {filtered.map((id) => (
                <Box
                  key={id}
                  onClick={() => { onChange(id); setOpen(false); setFilter(''); }}
                  sx={{
                    px: 2,
                    py: 1.2,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: id === value ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                    '&:hover': { background: id === value ? 'rgba(139, 92, 246, 0.15)' : 'rgba(161, 161, 170, 0.06)' },
                    transition: 'background 0.1s',
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: 13, fontFamily: 'monospace' }}>
                    {id}
                  </Typography>
                  {id === value && <CheckOutlined sx={{ fontSize: 16, color: 'primary.light' }} />}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
}
