'use client';

/**
 * NERA AI Dashboard - Usage Stats Component
 * Displays usage statistics cards (MUI)
 */

import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import BoltIcon from '@mui/icons-material/Bolt';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { UsageStats as UsageStatsType } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsageStatsProps {
  stats?: UsageStatsType | null;
  previousStats?: UsageStatsType;
  loading?: boolean;
  compact?: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  suffix?: string;
  prefix?: string;
  precision?: number;
  color?: string;
  trend?: number;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// StatCard sub-component
// ---------------------------------------------------------------------------

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  suffix,
  prefix,
  precision = 0,
  color,
  trend,
  loading,
}) => {
  // Format the displayed value
  const formattedValue =
    typeof value === 'number' ? value.toFixed(precision) : value;

  // Trend indicator
  const trendIndicator =
    trend !== undefined && trend !== 0 ? (
      <Stack direction="row" alignItems="center" spacing={0.5}>
        {trend > 0 ? (
          <TrendingUpIcon sx={{ fontSize: 14, color: '#4caf50' }} />
        ) : (
          <TrendingDownIcon sx={{ fontSize: 14, color: '#f44336' }} />
        )}
        <Typography
          variant="caption"
          sx={{ color: trend > 0 ? '#4caf50' : '#f44336', fontWeight: 500 }}
        >
          {Math.abs(trend).toFixed(1)}%
        </Typography>
      </Stack>
    ) : null;

  if (loading) {
    return (
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={36} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        {/* Title row */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          {icon}
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Stack>

        {/* Value row */}
        <Stack direction="row" alignItems="baseline" spacing={0.5}>
          {prefix && (
            <Typography variant="h5" sx={{ color, fontWeight: 600 }}>
              {prefix}
            </Typography>
          )}
          <Typography variant="h4" sx={{ color, fontWeight: 700 }}>
            {formattedValue}
          </Typography>
          {suffix && (
            <Typography variant="body2" color="text.secondary">
              {suffix}
            </Typography>
          )}
        </Stack>

        {/* Trend */}
        {trendIndicator && <Box sx={{ mt: 0.5 }}>{trendIndicator}</Box>}
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const UsageStatsComponent: React.FC<UsageStatsProps> = ({
  stats,
  previousStats,
  loading = false,
  compact = false,
}) => {
  // If stats not yet loaded, show loading state
  if (!stats) {
    return (
      <Grid container spacing={compact ? 1.5 : 2}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ p: 2 }}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" height={40} />
              <Skeleton variant="text" width="80%" />
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  // Calculate percentage change between current and previous period
  const calculateTrend = (
    current: number,
    previous?: number,
  ): number | undefined => {
    if (previous === undefined || previous === 0) return undefined;
    return ((current - previous) / previous) * 100;
  };

  const requestTrend = calculateTrend(
    stats.totalRequests,
    previousStats?.totalRequests,
  );
  const tokenTrend = calculateTrend(
    stats.totalTokens,
    previousStats?.totalTokens,
  );
  const costTrend = calculateTrend(stats.totalCost, previousStats?.totalCost);
  const latencyTrend = calculateTrend(
    stats.avgLatencyMs,
    previousStats?.avgLatencyMs,
  );

  const mdSize = compact ? 6 : 3;

  return (
    <Grid container spacing={2}>
      {/* Total Requests */}
      <Grid item xs={12} sm={6} md={mdSize}>
        <StatCard
          title="Total Requests"
          value={stats.totalRequests}
          icon={<ChatBubbleOutlineIcon sx={{ color: '#1890ff', fontSize: 18 }} />}
          color="#1890ff"
          trend={requestTrend}
          loading={loading}
        />
      </Grid>

      {/* Total Tokens */}
      <Grid item xs={12} sm={6} md={mdSize}>
        <StatCard
          title="Total Tokens"
          value={
            stats.totalTokens >= 1_000_000
              ? `${(stats.totalTokens / 1_000_000).toFixed(2)}M`
              : stats.totalTokens >= 1_000
                ? `${(stats.totalTokens / 1_000).toFixed(1)}K`
                : stats.totalTokens
          }
          icon={<BoltIcon sx={{ color: '#722ed1', fontSize: 18 }} />}
          color="#722ed1"
          trend={tokenTrend}
          loading={loading}
        />
      </Grid>

      {/* Total Cost */}
      <Grid item xs={12} sm={6} md={mdSize}>
        <StatCard
          title="Total Cost"
          value={stats.totalCost}
          icon={<AttachMoneyIcon sx={{ color: '#4caf50', fontSize: 18 }} />}
          prefix="$"
          precision={2}
          color="#4caf50"
          trend={costTrend}
          loading={loading}
        />
      </Grid>

      {/* Success Rate */}
      <Grid item xs={12} sm={6} md={mdSize}>
        <Tooltip
          title={`${stats.successRate.toFixed(1)}% of requests completed successfully`}
        >
          <Box>
            <StatCard
              title="Success Rate"
              value={stats.successRate}
              icon={
                <CheckCircleOutlineIcon
                  sx={{
                    color: stats.successRate >= 95 ? '#4caf50' : '#ff9800',
                    fontSize: 18,
                  }}
                />
              }
              suffix="%"
              precision={1}
              color={stats.successRate >= 95 ? '#4caf50' : '#ff9800'}
              loading={loading}
            />
          </Box>
        </Tooltip>
      </Grid>

      {/* Avg Latency – only shown in non-compact mode */}
      {!compact && (
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg Latency"
            value={stats.avgLatencyMs}
            icon={<AccessTimeIcon sx={{ color: '#00bcd4', fontSize: 18 }} />}
            suffix="ms"
            precision={0}
            color="#00bcd4"
            trend={latencyTrend ? -latencyTrend : undefined} // Invert: lower latency is better
            loading={loading}
          />
        </Grid>
      )}
    </Grid>
  );
};

export default UsageStatsComponent;
