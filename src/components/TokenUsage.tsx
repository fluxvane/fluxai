'use client';

/**
 * NERA AI Dashboard - Token Usage Chart Component
 * Displays token usage over time with interactive charts
 */

import React, { useMemo } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import BoltIcon from '@mui/icons-material/Bolt';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import type { DailyUsage } from '../types';
import dayjs from 'dayjs';

interface TooltipPayloadEntry {
	name: string;
	value: number;
	color: string;
}

interface CustomTooltipProps {
	active?: boolean;
	payload?: TooltipPayloadEntry[];
	label?: string;
}

interface TokenUsageProps {
  data: DailyUsage[];
  loading?: boolean;
  chartType?: 'area' | 'bar' | 'composed';
  onChartTypeChange?: (type: 'area' | 'bar' | 'composed') => void;
  height?: number;
  showCost?: boolean;
}

const COLORS = {
  tokens: '#722ed1',
  requests: '#1890ff',
  cost: '#52c41a',
  successRate: '#faad14',
};

const TokenUsage: React.FC<TokenUsageProps> = ({
  data,
  loading = false,
  chartType = 'area',
  onChartTypeChange,
  height = 300,
  showCost = true,
}) => {
  // Format data for charts
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      date: dayjs(item.date).format('MMM DD'),
      tokens: item.tokens / 1000, // Convert to K
      cost: item.cost,
    }));
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;

    return (
      <Card variant="outlined" sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ display: 'block', mb: 1 }}>
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Box key={index} sx={{ mb: 0.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box component="span" sx={{ color: entry.color }}>●</Box>
              <Typography variant="body2" color="text.secondary">
                {entry.name}:
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {entry.name === 'Tokens'
                  ? `${entry.value.toFixed(1)}K`
                  : entry.name === 'Cost'
                  ? `$${entry.value.toFixed(2)}`
                  : entry.value}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Card>
    );
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <Box
          sx={{
            height,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No usage data available
          </Typography>
        </Box>
      );
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              {showCost && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />}
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="tokens"
                name="Tokens"
                fill={COLORS.tokens}
                radius={[4, 4, 0, 0]}
              />
              {showCost && (
                <Bar
                  yAxisId="right"
                  dataKey="cost"
                  name="Cost"
                  fill={COLORS.cost}
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="tokens"
                name="Tokens"
                fill={COLORS.tokens}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="requests"
                name="Requests"
                stroke={COLORS.requests}
                strokeWidth={2}
                dot={{ fill: COLORS.requests, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'area':
      default:
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="tokens"
                name="Tokens"
                stroke={COLORS.tokens}
                fill={COLORS.tokens}
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="requests"
                name="Requests"
                stroke={COLORS.requests}
                fill={COLORS.requests}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card variant="outlined">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <BoltIcon fontSize="small" />
          <Typography variant="subtitle1" fontWeight={600}>
            Token Usage
          </Typography>
        </Stack>
        {onChartTypeChange && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={chartType}
            onChange={(_e, value) => {
              if (value !== null) onChartTypeChange(value);
            }}
          >
            <ToggleButton value="area">Area</ToggleButton>
            <ToggleButton value="bar">Bar</ToggleButton>
            <ToggleButton value="composed">Combined</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>
      <CardContent>
        {loading ? (
          <Box
            sx={{
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">
              Loading usage data...
            </Typography>
          </Box>
        ) : (
          renderChart()
        )}
      </CardContent>
    </Card>
  );
};

export default TokenUsage;
