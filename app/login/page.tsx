'use client';

import React, { useState } from 'react';
import {
  Box, Card, CardContent, Button, Typography, Alert,
  CircularProgress,
} from '@mui/material';
import { Login as LoginIcon, SmartToy as SmartToyIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/chat');
    }
  }, [isAuthenticated, router]);

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start sign-in');
      setIsLoading(false);
      return;
    } finally {
      // The browser should navigate away immediately for OIDC redirect.
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: '100%',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <SmartToyIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" fontWeight={700} gutterBottom>
              NERA AI
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in with Identity / IAM to access your AI workspace
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={!isLoading ? <LoginIcon /> : undefined}
              onClick={handleSignIn}
              disabled={isLoading}
              sx={{ py: 1.5 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Continue with Identity'}
            </Button>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2, textAlign: 'center' }}
            >
              You will be redirected to the central IAM sign-in flow.
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
            Powered by NERA AI Platform &mdash; NextEra Systems
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
