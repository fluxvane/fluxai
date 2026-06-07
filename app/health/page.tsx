'use client';

import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack, Box,
  CircularProgress,
} from '@mui/material';
import { CheckCircleOutlineRounded } from '@mui/icons-material';
import { useSettings } from '@/contexts/SettingsContext';

export default function HealthPage() {
  const { settings, hasSettings, isLoaded } = useSettings();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'ok' | 'fail' | null>(null);

  const handleCheck = async () => {
    if (!settings) return;
    setOpen(true);
    setChecking(true);
    setStatus(null);
    try {
      const r = await fetch('/api/proxy/models');
      setStatus(r.ok ? 'ok' : 'fail');
    } catch {
      setStatus('fail');
    } finally {
      setChecking(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Stack spacing={3} sx={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={700}>Flux AI · Health Check</Typography>
        <Typography variant="body2" color="text.secondary">
          Verify your proxy endpoint is reachable and your API key is valid.
        </Typography>
        <Button variant="contained" onClick={handleCheck} disabled={!hasSettings}>
          Run check
        </Button>
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Health check</DialogTitle>
        <DialogContent>
          {checking && (
            <Stack direction="row" spacing={2} alignItems="center">
              <CircularProgress size={20} />
              <Typography>Reaching your proxy…</Typography>
            </Stack>
          )}
          {!checking && status === 'ok' && (
            <Stack direction="row" spacing={2} alignItems="center">
              <CheckCircleOutlineRounded sx={{ color: 'success.main' }} />
              <Typography>Endpoint reachable, key accepted.</Typography>
            </Stack>
          )}
          {!checking && status === 'fail' && (
            <Typography color="error">Could not reach endpoint or key rejected.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
