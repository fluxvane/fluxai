'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Button, TextField, Typography, Alert, InputAdornment, IconButton,
  CircularProgress, Stack, Chip, Divider,
} from '@mui/material';
import {
  Visibility, VisibilityOff, HubOutlined, KeyOutlined, TuneOutlined,
  ArrowForward, CheckCircleOutlineRounded, LogoutOutlined,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const QUICK_MODELS = ['chat', 'speed', 'coding', 'hermes', 'review'];

export default function ConfigPage() {
  const router = useRouter();
  const { user, isLoaded, config, saveConfig, logout } = useAuth();
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('chat');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) router.replace('/login');
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (config) {
      setEndpoint(config.endpoint);
      setDefaultModel(config.defaultModel || 'chat');
    }
  }, [config]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!endpoint.trim() || !apiKey.trim()) {
      setError('Endpoint and API key are required.');
      return;
    }
    setBusy(true);
    try {
      const result = await saveConfig(endpoint, apiKey, defaultModel || 'chat');
      if (!result.ok) {
        setError(result.error ?? 'Could not validate your configuration.');
        return;
      }
      router.replace('/chat');
    } finally {
      setBusy(false);
    }
  };

  if (isLoaded && !user) return null;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 480 }}
      >
        <Stack spacing={2} alignItems="center" sx={{ mb: 3, textAlign: 'center' }}>
          <Box
            sx={{
              width: 52, height: 52, borderRadius: 3,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)',
            }}
          >
            <TuneOutlined sx={{ color: 'white', fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
              Connect your proxy
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 14 }}>
              {user ? `Almost there, ${user.name.split(' ')[0]}. ` : ''}
              We&apos;ll verify the endpoint before continuing.
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            p: 3, borderRadius: 3,
            border: '1px solid rgba(161, 161, 170, 0.12)',
            background: 'rgba(24, 24, 27, 0.65)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
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
                placeholder="https://your-proxy.example.com/v1"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                fullWidth required autoComplete="off"
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
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                fullWidth required autoComplete="off"
                type={showKey ? 'text' : 'password'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyOutlined sx={{ color: 'text.secondary', fontSize: 18 }} />
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

              <Box>
                <TextField
                  label="Default model"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  fullWidth
                  helperText="Used for new chats. You can switch models anytime."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TuneOutlined sx={{ color: 'text.secondary', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Stack direction="row" spacing={0.75} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.75 }}>
                  {QUICK_MODELS.map((m) => (
                    <Chip
                      key={m}
                      label={m}
                      size="small"
                      onClick={() => setDefaultModel(m)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: defaultModel === m ? 'rgba(139,92,246,0.18)' : 'rgba(161,161,170,0.08)',
                        color: defaultModel === m ? 'primary.light' : 'text.secondary',
                        border: defaultModel === m ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                        fontFamily: 'monospace', fontSize: 12,
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={busy}
                endIcon={!busy ? <ArrowForward /> : undefined}
                sx={{ mt: 0.5, py: 1.25, fontSize: 14.5 }}
              >
                {busy ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Verify & continue'}
              </Button>
            </Stack>
          </form>

          <Divider sx={{ my: 2, borderColor: 'rgba(161,161,170,0.1)' }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={0.75} alignItems="center">
              <CheckCircleOutlineRounded sx={{ fontSize: 15, color: 'success.main' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                Your key is stored server-side, never exposed to the browser.
              </Typography>
            </Stack>
            <Button
              size="small"
              color="inherit"
              startIcon={<LogoutOutlined sx={{ fontSize: 16 }} />}
              onClick={async () => { await logout(); router.replace('/login'); }}
              sx={{ color: 'text.secondary', fontSize: 12 }}
            >
              Sign out
            </Button>
          </Stack>
        </Box>
      </motion.div>
    </Box>
  );
}
