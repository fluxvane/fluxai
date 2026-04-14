'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { SmartToy as SmartToyIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { exchangeCodeForTokens } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setError(errorDescription || errorParam);
        setIsProcessing(false);
        return;
      }

      if (!code || !state) {
        setError('Missing authorization code or state');
        setIsProcessing(false);
        return;
      }

      try {
        await exchangeCodeForTokens(code, state);
        router.replace('/chat');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setIsProcessing(false);
      }
    };

    void run();
  }, [exchangeCodeForTokens, router, searchParams]);

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
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: 4,
          textAlign: 'center',
          background: 'rgba(30, 41, 59, 0.95)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        <Stack spacing={2} alignItems="center">
          <SmartToyIcon sx={{ fontSize: 48, color: 'primary.main' }} />

          {error ? (
            <>
              <Typography variant="h5" fontWeight={700} color="error.main">
                Sign-in failed
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {error}
              </Typography>
              <Button variant="contained" onClick={() => router.replace('/login')}>
                Return to login
              </Button>
            </>
          ) : (
            <>
              <CircularProgress size={32} />
              <Typography variant="h6" fontWeight={700}>
                Completing sign-in
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isProcessing ? 'We are validating your Identity session…' : 'Redirecting…'}
              </Typography>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}