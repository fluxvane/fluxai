'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Button, TextField, Typography, Alert, InputAdornment, IconButton,
  CircularProgress, Stack,
} from '@mui/material';
import {
  Visibility, VisibilityOff, HubOutlined, KeyOutlined, PersonOutline,
  AutoAwesome, ArrowForward, CheckCircleOutlineRounded,
} from '@mui/icons-material';
import { useSettings, type Settings } from '@/contexts/SettingsContext';

interface FormState {
  endpoint: string;
  apiKey: string;
  name: string;
}

const EMPTY_FORM: FormState = { endpoint: '', apiKey: '', name: '' };

export default function LoginPage() {
  const router = useRouter();
  const { save, hasSettings, isLoaded } = useSettings();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isLoaded && hasSettings) {
      router.replace('/chat');
    }
  }, [isLoaded, hasSettings, router]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.endpoint.trim() || !form.apiKey.trim() || !form.name.trim()) {
      setError('Please fill in all three fields to continue.');
      return;
    }

    if (!/^https?:\/\//i.test(form.endpoint.trim())) {
      setError('Endpoint must start with http:// or https://');
      return;
    }

    startTransition(() => {
      const settings: Settings = {
        endpoint: form.endpoint.trim().replace(/\/+$/, ''),
        apiKey: form.apiKey.trim(),
        name: form.name.trim(),
        defaultModel: 'speed',
      };
      save(settings);
      router.replace('/chat');
    });
  };

  const ready = !!(form.endpoint.trim() && form.apiKey.trim() && form.name.trim());

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 440,
          animation: 'fadeIn 0.4s ease-out',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(8px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Stack spacing={3} alignItems="center" sx={{ mb: 4, textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.35)',
            }}
          >
            <AutoAwesome sx={{ color: 'white', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em', mb: 0.75 }}>
              Sign in to Flux AI
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 14 }}>
              Connect your OpenAI-compatible proxy to start chatting.
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid rgba(161, 161, 170, 0.12)',
            background: 'rgba(24, 24, 27, 0.6)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: 13 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="AI Endpoint"
                placeholder="https://proxy.fluxvane.com/v1"
                value={form.endpoint}
                onChange={(e) => set('endpoint', e.target.value)}
                fullWidth
                required
                autoComplete="off"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HubOutlined sx={{ color: 'text.secondary', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="API Key"
                placeholder="sk-…"
                value={form.apiKey}
                onChange={(e) => set('apiKey', e.target.value)}
                fullWidth
                required
                autoComplete="off"
                type={showKey ? 'text' : 'password'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyOutlined sx={{ color: 'text.secondary', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowKey((s) => !s)}
                        edge="end"
                        size="small"
                        aria-label={showKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showKey ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Your Name"
                placeholder="Ada Lovelace"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                fullWidth
                required
                autoComplete="off"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutline sx={{ color: 'text.secondary', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isPending || !ready}
                endIcon={!isPending && ready ? <ArrowForward /> : undefined}
                sx={{ mt: 0.5, py: 1.25, fontSize: 14.5 }}
              >
                {isPending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Continue'}
              </Button>
            </Stack>
          </form>
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ mt: 2.5 }}>
          <CheckCircleOutlineRounded sx={{ fontSize: 14, color: 'success.main' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
            Stored locally in your browser. Nothing is sent to a server.
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
