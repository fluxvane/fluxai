'use client';

import React, { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack,
  InputAdornment, IconButton, Alert, CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, HubOutlined, KeyOutlined, PersonOutline } from '@mui/icons-material';
import { useSettings, type Settings } from '@/contexts/SettingsContext';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { settings, save } = useSettings();
  const [form, setForm] = useState<Settings>(() =>
    settings ?? { endpoint: '', apiKey: '', name: '', defaultModel: 'gemini/gemini-2.0-flash-lite' }
  );
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    if (open && settings) {
      setForm(settings);
      setError(null);
    }
  }, [open, settings]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.endpoint.trim() || !form.apiKey.trim() || !form.name.trim()) {
      setError('All fields are required.');
      return;
    }
    startTransition(() => {
      save({
        endpoint: form.endpoint.trim(),
        apiKey: form.apiKey.trim(),
        name: form.name.trim(),
        defaultModel: form.defaultModel || 'gemini/gemini-2.0-flash-lite',
      });
      onClose();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(24, 24, 27, 0.92)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(161, 161, 170, 0.15)',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Settings</DialogTitle>
      <form onSubmit={handleSave}>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
            <TextField
              label="AI Endpoint (proxy URL)"
              placeholder="https://proxy.fluxvane.com/v1"
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
            <TextField
              label="Default Model"
              value={form.defaultModel}
              onChange={(e) => set('defaultModel', e.target.value)}
              fullWidth
              helperText="You can change the model per-message from the chat header."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
