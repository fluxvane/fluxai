'use client';

import React from 'react';
import { Box, Stack, Typography, Card, CardContent, Chip, CircularProgress } from '@mui/material';
import {
  AutoAwesome, ChatOutlined, BoltOutlined, HubOutlined, ImageOutlined, TokenOutlined,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, Tooltip as RTooltip, Cell,
} from 'recharts';
import AppShell from '@/components/AppShell';

interface AnalyticsData {
  totals: {
    conversations: number;
    messages: number;
    userMessages: number;
    assistantMessages: number;
    images: number;
    promptTokens: number;
    completionTokens: number;
  };
  modelUsage: Array<{ model: string; count: number }>;
  daily: Array<{ date: string; count: number }>;
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch('/api/analytics', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load analytics');
  return res.json();
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: fetchAnalytics, staleTime: 30_000 });

  return (
    <AppShell>
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 }, width: '100%' }}>
        <Stack spacing={1} sx={{ mb: 4 }}>
          <Typography variant="overline" color="primary.light" sx={{ letterSpacing: '0.12em', fontWeight: 600 }}>
            Analytics
          </Typography>
          <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
            Your activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live stats from your account database.
          </Typography>
        </Stack>

        {isLoading || !data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
        ) : (
          <Content data={data} />
        )}
      </Box>
    </AppShell>
  );
}

function Content({ data }: { data: AnalyticsData }) {
  const { totals, modelUsage, daily } = data;
  const totalTokens = totals.promptTokens + totals.completionTokens;
  const maxDay = Math.max(1, ...daily.map((d) => d.count));
  const chartData = daily.map((d) => ({
    label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
    date: d.date,
    count: d.count,
  }));

  const cards = [
    { icon: <ChatOutlined />, label: 'Conversations', value: totals.conversations },
    { icon: <AutoAwesome />, label: 'Messages', value: totals.messages, subtitle: `${totals.userMessages} from you` },
    { icon: <BoltOutlined />, label: 'AI responses', value: totals.assistantMessages },
    { icon: <ImageOutlined />, label: 'Images', value: totals.images },
  ];

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
          >
            <StatCard {...c} />
          </motion.div>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr' }, gap: 2 }}>
        <Card sx={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(161,161,170,0.1)' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>Last 14 days</Typography>
            <Typography variant="caption" color="text.secondary">Messages per day</Typography>
            <Box sx={{ height: 220, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} interval={0} />
                  <RTooltip
                    cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                    contentStyle={{ background: 'rgba(20,20,23,0.96)', border: '1px solid rgba(161,161,170,0.2)', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: '#fafafa' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {chartData.map((d) => (
                      <Cell key={d.date} fill={d.count > 0 ? 'url(#fluxBar)' : 'rgba(161,161,170,0.12)'} />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="fluxBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Peak day: {maxDay} message{maxDay === 1 ? '' : 's'}
            </Typography>
          </CardContent>
        </Card>

        <Stack spacing={2}>
          <StatCard icon={<TokenOutlined />} label="Tokens used" value={totalTokens} subtitle={`${totals.promptTokens} in · ${totals.completionTokens} out`} />
          <Card sx={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(161,161,170,0.1)', flex: 1 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <HubOutlined sx={{ color: 'primary.light', fontSize: 20 }} />
                <Typography variant="h6" fontWeight={600}>Models used</Typography>
              </Stack>
              {modelUsage.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No AI responses yet. Start a chat to see model stats.
                </Typography>
              ) : (
                <Stack spacing={1.2}>
                  {modelUsage.slice(0, 6).map((m) => (
                    <Box key={m.model} sx={{ p: 1.25, borderRadius: 2, background: 'rgba(161,161,170,0.04)', border: '1px solid rgba(161,161,170,0.08)' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mr: 1 }}>
                          {m.model}
                        </Typography>
                        <Chip label={m.count} size="small" sx={{ height: 22, fontSize: 11 }} />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </>
  );
}

function StatCard({ icon, label, value, subtitle }: { icon: React.ReactNode; label: string; value: number; subtitle?: string }) {
  return (
    <Card sx={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(161,161,170,0.1)', height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(236,72,153,0.15) 100%)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.light' }}>
            {icon}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </Typography>
        </Stack>
        <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
          {value.toLocaleString()}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: 11 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
