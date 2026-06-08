'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, hasConfig, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.replace('/login');
    else if (!hasConfig) router.replace('/config');
    else router.replace('/chat');
  }, [isLoaded, user, hasConfig, router]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  );
}
