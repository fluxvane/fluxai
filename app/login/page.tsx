'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Button, Card, CardContent, TextField, Typography, Stack, Alert,
  InputAdornment, IconButton, CircularProgress, Chip,
} from '@mui/material';
import {
  Visibility, VisibilityOff, BoltOutlined, AutoAwesome, KeyOutlined,
  HubOutlined, PersonOutline, ArrowForward, RocketLaunchOutlined,
} from '@mui/icons-material';
import { useSettings, type Settings } from '@/contexts/SettingsContext';

interface FormState {
  endpoint: string;
  apiKey: string;
  name: string;
}

const PLACEHOLDERS: FormState = {
  endpoint: 'https://proxy.fluxvane.com/v1',
  apiKey: 'sk-...',
  name: 'Ada Lovelace',
};

export default function LoginPage() {
  const router = useRouter();
  const { save, hasSettings, isLoaded } = useSettings();
  const [form, setForm] = useState<FormState>({ endpoint: '', apiKey: '', name: '' });
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

    startTransition(() => {
      const settings: Settings = {
        endpoint: form.endpoint.trim(),
        apiKey: form.apiKey.trim(),
        name: form.name.trim(),
        defaultModel: 'gemini/gemini-2.0-flash-lite',
      };
      save(settings);
      router.replace('/chat');
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 20% 30%, rgba(139,92,246,0.20), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 70%, rgba(236,72,153,0.15), transparent 60%)',
          pointerEvents: 'none',
          animation: 'pulse 8s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 0.8 },
            '50%': { opacity: 1 },
          },
        }}
      />

      <Box sx={{ width: '100%', maxWidth: 1100, position: 'relative', zIndex: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} alignItems="center">
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={{ xs: 'center', md: 'flex-start' }} sx={{ mb: 3 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
                }}
              >
                <AutoAwesome sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Typography variant="h5" fontWeight={700}>
                Flux AI
              </Typography>
            </Stack>

            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: 40, md: 56 },
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #fafafa 0%, #a1a1aa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
              }}
            >
              Talk to any model.<br />Through your own proxy.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, fontSize: 17, lineHeight: 1.6 }}>
              Connect your OpenAI-compatible endpoint, drop in an API key, and start chatting with
              200+ models — from Gemini and GPT to Claude and beyond. Your keys stay in your browser.
            </Typography>

            <Stack direction="row" spacing={1.5} sx={{ mt: 4 }} flexWrap="wrap" useFlexGap justifyContent={{ xs: 'center', md: 'flex-start' }}>
              <Chip icon={<BoltOutlined sx={{ fontSize: 16 }} />} label="Streaming" size="small" sx={{ bgcolor: 'rgba(139,92,246,0.10)', color: 'text.primary', border: '1px solid rgba(139,92,246,0.25)' }} />
              <Chip icon={<HubOutlined sx={{ fontSize: 16 }} />} label="Any OpenAI-compatible proxy" size="small" sx={{ bgcolor: 'rgba(236,72,153,0.10)', color: 'text.primary', border: '1px solid rgba(236,72,153,0.25)' }} />
              <Chip icon={<RocketLaunchOutlined sx={{ fontSize: 16 }} />} label="Zero backend" size="small" sx={{ bgcolor: 'rgba(59,130,246,0.10)', color: 'text.primary', border: '1px solid rgba(59,130,246,0.25)' }} />
            </Stack>
          </Box>

          <Card
            elevation={0}
            sx={{
              flex: 1,
              maxWidth: 480,
              width: '100%',
              background: 'rgba(24, 24, 27, 0.65)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(161, 161, 170, 0.12)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                Get started
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Your credentials are stored locally in your browser. Nothing is sent to a server.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="AI Endpoint (proxy URL)"
                    placeholder={PLACEHOLDERS.endpoint}
                    value={form.endpoint}
                    onChange={(e) => set('endpoint', e.target.value)}
                    fullWidth
                    required
                    autoComplete="off"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <HubOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="API Key"
                    placeholder={PLACEHOLDERS.apiKey}
                    value={form.apiKey}
                    onChange={(e) => set('apiKey', e.target.value)}
                    fullWidth
                    required
                    autoComplete="off"
                    type={showKey ? 'text' : 'password'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowKey((s) => !s)} edge="end" size="small">
                            {showKey ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="Your Name"
                    placeholder={PLACEHOLDERS.name}
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    fullWidth
                    required
                    autoComplete="off"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutline sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={isPending}
                    endIcon={!isPending ? <ArrowForward /> : undefined}
                    sx={{ mt: 1, py: 1.5, fontSize: 15 }}
                  >
                    {isPending ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Start Chatting'}
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
}
