'use client';

/**
 * NERA AI Dashboard - Cost Estimate Component
 * Displays cost breakdown and projections
 */

import React, { useMemo } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PieChartIcon from '@mui/icons-material/PieChart';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BoltIcon from '@mui/icons-material/Bolt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DailyUsage } from '../types';
import dayjs from 'dayjs';

interface ModelCost {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  percentage: number;
}

interface CostEstimateProps {
  dailyUsage: DailyUsage[];
  modelCosts?: ModelCost[];
  budget?: number;
  loading?: boolean;
}

interface PieTooltipProps {
	active?: boolean;
	payload?: Array<{ payload: { name: string; value: number } }>;
}

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: '#10a37f',
  Anthropic: '#c96442',
  Google: '#4285f4',
  Azure: '#0078d4',
  AWS: '#ff9900',
  Cohere: '#39594d',
  Other: '#666666',
};

const CostEstimate: React.FC<CostEstimateProps> = ({
  dailyUsage,
  modelCosts = [],
  budget,
  loading = false,
}) => {
  // Calculate totals and projections
  const calculations = useMemo(() => {
    const now = dayjs();
    const daysInMonth = now.daysInMonth();
    const daysPassed = now.date();

    const totalCost = dailyUsage.reduce((sum, d) => sum + d.cost, 0);
    const totalTokens = dailyUsage.reduce((sum, d) => sum + d.tokens, 0);
    const totalRequests = dailyUsage.reduce((sum, d) => sum + d.requests, 0);

    // Daily average
    const avgDailyCost = dailyUsage.length > 0 ? totalCost / dailyUsage.length : 0;

    // Monthly projection
    const projectedMonthly = avgDailyCost * daysInMonth;

    // Budget usage
    const budgetUsed = budget ? (totalCost / budget) * 100 : 0;
    const budgetRemaining = budget ? budget - totalCost : undefined;
    const daysRemaining = daysInMonth - daysPassed;

    // Projected overage
    const projectedOverage = budget ? projectedMonthly - budget : undefined;

    return {
      totalCost,
      totalTokens,
      totalRequests,
      avgDailyCost,
      projectedMonthly,
      budgetUsed,
      budgetRemaining,
      daysRemaining,
      projectedOverage,
      isOverBudget: budget ? projectedMonthly > budget : false,
    };
  }, [dailyUsage, budget]);

  // Pie chart data by provider
  const pieData = useMemo(() => {
    const providerTotals: Record<string, number> = {};

    modelCosts.forEach((mc) => {
      providerTotals[mc.provider] = (providerTotals[mc.provider] || 0) + mc.cost;
    });

    return Object.entries(providerTotals).map(([provider, cost]) => ({
      name: provider,
      value: cost,
      color: PROVIDER_COLORS[provider] || PROVIDER_COLORS.Other,
    }));
  }, [modelCosts]);

  // Budget progress color
  const getBudgetColor = (pct: number): 'success' | 'warning' | 'error' => {
    if (pct >= 90) return 'error';
    if (pct >= 70) return 'warning';
    return 'success';
  };

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }: PieTooltipProps) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <Card sx={{ boxShadow: 3, p: 1 }}>
        <Stack spacing={0.5}>
          <Typography variant="body2" fontWeight="bold">
            {data.name}
          </Typography>
          <Typography variant="body2">${data.value.toFixed(2)}</Typography>
        </Stack>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader
          avatar={<AttachMoneyIcon />}
          title="Cost Breakdown"
        />
        <CardContent>
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        avatar={<AttachMoneyIcon />}
        title="Cost Breakdown"
      />
      <CardContent>
        {/* Budget Alert */}
        {budget && calculations.isOverBudget && (
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Budget Projection Warning
            </Typography>
            <Typography variant="body2">
              At current usage, projected monthly cost ($
              {calculations.projectedMonthly.toFixed(2)}) will exceed budget ($
              {budget.toFixed(2)}) by ${calculations.projectedOverage?.toFixed(2)}
            </Typography>
          </Alert>
        )}

        {/* Summary Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <AttachMoneyIcon fontSize="small" color="primary" />
                  <Typography variant="caption" color="text.secondary">
                    Total Cost
                  </Typography>
                </Stack>
                <Typography variant="h5" sx={{ color: 'primary.main' }}>
                  ${calculations.totalCost.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <CalendarTodayIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    Avg Daily
                  </Typography>
                </Stack>
                <Typography variant="h5">
                  ${calculations.avgDailyCost.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <TrendingUpIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    Projected Monthly
                  </Typography>
                </Stack>
                <Typography
                  variant="h5"
                  sx={{ color: calculations.isOverBudget ? 'error.main' : 'success.main' }}
                >
                  ${calculations.projectedMonthly.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <AttachMoneyIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    Budget Used
                  </Typography>
                </Stack>
                <Typography variant="h5">
                  {budget ? `${Math.min(calculations.budgetUsed, 100).toFixed(0)}%` : 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Budget Progress */}
        {budget && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                Budget Usage
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ${calculations.totalCost.toFixed(2)} / ${budget.toFixed(2)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(calculations.budgetUsed, 100)}
              color={getBudgetColor(calculations.budgetUsed)}
              sx={{ height: 8, borderRadius: 1, mb: 0.5 }}
            />
            <Typography variant="caption" color="text.secondary">
              {calculations.budgetRemaining !== undefined && calculations.budgetRemaining > 0
                ? `$${calculations.budgetRemaining.toFixed(2)} remaining for ${calculations.daysRemaining} days`
                : 'Budget exceeded'}
            </Typography>
          </Box>
        )}

        {/* Cost by Provider Pie Chart */}
        {pieData.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <PieChartIcon fontSize="small" />
              <Typography variant="h6">Cost by Provider</Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  {pieData.map((item) => (
                    <Box
                      key={item.name}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: item.color,
                          }}
                        />
                        <Typography variant="body2">{item.name}</Typography>
                      </Stack>
                      <Typography variant="body2" fontWeight="bold">
                        ${item.value.toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </>
        )}

        {/* Model Cost Breakdown Table */}
        {modelCosts.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <BoltIcon fontSize="small" />
              <Typography variant="h6">Cost by Model</Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Model</TableCell>
                    <TableCell>Requests</TableCell>
                    <TableCell>Input Tokens</TableCell>
                    <TableCell>Output Tokens</TableCell>
                    <TableCell>Cost</TableCell>
                    <TableCell>% of Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modelCosts.map((row) => (
                    <TableRow key={row.model}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={row.provider}
                            size="small"
                            sx={{
                              bgcolor: PROVIDER_COLORS[row.provider] || PROVIDER_COLORS.Other,
                              color: '#fff',
                            }}
                          />
                          <Typography variant="body2">{row.model}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {((row.inputTokens + row.outputTokens) / 1000).toFixed(1)}K
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {(row.inputTokens / 1000).toFixed(1)}K
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {(row.outputTokens / 1000).toFixed(1)}K
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          ${row.cost.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={row.percentage}
                            sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
                          />
                          <Typography variant="caption" sx={{ minWidth: 36 }}>
                            {row.percentage.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CostEstimate;
