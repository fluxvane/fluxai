'use client';

import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  Chat as ChatIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import UsageStats from '@/components/UsageStats';
import TokenUsage from '@/components/TokenUsage';
import CostEstimate from '@/components/CostEstimate';
import AuthGuard from '@/components/AuthGuard';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function AnalyticsPage() {
  const { data, stats, isLoading } = useAnalytics();
  const dailyUsage = data?.dailyUsage ?? [];

  return (
    <AuthGuard>
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <SmartToyIcon color="primary" />
          <Typography variant="h6" color="text.primary" sx={{ flexGrow: 1 }}>
            NERA AI — Analytics
          </Typography>
          <Tooltip title="Back to Chat">
            <IconButton component={Link} href="/chat" sx={{ color: 'text.secondary' }}>
              <ChatIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ flexGrow: 1, p: 3, pt: '88px' }}>
        {/* Usage Stats */}
        <UsageStats stats={stats} loading={isLoading} />

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Token Usage Chart */}
          <Grid item xs={12} lg={8}>
            <TokenUsage data={dailyUsage} loading={isLoading} height={350} showCost />
          </Grid>

          {/* Cost Estimate */}
          <Grid item xs={12} lg={4}>
            <CostEstimate dailyUsage={dailyUsage} loading={isLoading} />
          </Grid>
        </Grid>
      </Box>
    </Box>
    </AuthGuard>
  );
}
