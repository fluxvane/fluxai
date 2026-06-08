'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Button, TextField, Typography, Alert, InputAdornment, IconButton,
  CircularProgress, Stack, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Visibility, VisibilityOff, MailOutline, LockOutlined, PersonOutline,
  AutoAwesome, ArrowForward,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'signin' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const { user, hasConfig, isLoaded, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      router.replace(hasConfig ? '/chat' : '/config');
    }
  }, [isLoaded, user, hasConfig, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === 'signin'
          ? await login(email, password)
          : await register(email, password, name);
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong.');
        return;
      }
      router.replace(result.hasConfig ? '/chat' : '/config');
    } finally {
      setBusy(false);
    }
  };

  const ready =
    mode === 'signin'
      ? Boolean(email.trim() && password)
      : Boolean(name.trim() && email.trim() && password);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 430 }}
      >
        <Stack spacing={2.5} alignItems="center" sx={{ mb: 3.5, textAlign: 'center' }}>
          <motion.div
            initial={{ rotate: -8, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          >
            <Box
              sx={{
                width: 52, height: 52, borderRadius: 3,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(139, 92, 246, 0.45)',
              }}
            >
              <AutoAwesome sx={{ color: 'white', fontSize: 26 }} />
            </Box>
          </motion.div>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 14 }}>
              {mode === 'signin'
                ? 'Sign in to continue to Flux AI.'
                : 'Join Flux AI — your gateway to any model.'}
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
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={mode}
            onChange={(_, v: Mode | null) => v && (setMode(v), setError(null))}
            sx={{
              mb: 2.5,
              bgcolor: 'rgba(161,161,170,0.06)',
              borderRadius: 2,
              p: 0.5,
              '& .MuiToggleButton-root': {
                border: 0, borderRadius: 1.5, py: 0.75, fontSize: 13.5, fontWeight: 600,
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'rgba(139,92,246,0.18)',
                  color: 'primary.light',
                  '&:hover': { bgcolor: 'rgba(139,92,246,0.24)' },
                },
              },
            }}
          >
            <ToggleButton value="signin">Sign in</ToggleButton>
            <ToggleButton value="register">Register</ToggleButton>
          </ToggleButtonGroup>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: 13 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <AnimatePresence initial={false} mode="popLayout">
                {mode === 'register' && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <TextField
                      label="Your name"
                      placeholder="Ada Lovelace"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      fullWidth
                      autoComplete="name"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutline sx={{ color: 'text.secondary', fontSize: 18 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <TextField
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                autoComplete="email"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutline sx={{ color: 'text.secondary', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Password"
                name="password"
                placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                type={showPw ? 'text' : 'password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: 'text.secondary', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPw((s) => !s)}
                        edge="end"
                        size="small"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={busy || !ready}
                endIcon={!busy && ready ? <ArrowForward /> : undefined}
                sx={{ mt: 0.5, py: 1.25, fontSize: 14.5 }}
              >
                {busy ? (
                  <CircularProgress size={18} sx={{ color: 'white' }} />
                ) : mode === 'signin' ? (
                  'Sign in'
                ) : (
                  'Create account'
                )}
              </Button>
            </Stack>
          </form>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 2.5, fontSize: 12 }}
        >
          {mode === 'signin' ? "Don't have an account? " : 'Already registered? '}
          <Box
            component="span"
            onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setError(null); }}
            sx={{ color: 'primary.light', cursor: 'pointer', fontWeight: 600 }}
          >
            {mode === 'signin' ? 'Register' : 'Sign in'}
          </Box>
        </Typography>
      </motion.div>
    </Box>
  );
}
