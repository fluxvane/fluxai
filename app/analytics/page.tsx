'use client';

import React, { useEffect, useState } from 'react';
import { Box, Stack, Typography, Card, CardContent, Chip } from '@mui/material';
import { AutoAwesome, ChatOutlined, BoltOutlined, HubOutlined, TrendingUpOutlined } from '@mui/icons-material';
import AppShell from '@/components/AppShell';
import { useSettings } from '@/contexts/SettingsContext';

interface ConversationEntry {
  id: string;
  title: string;
  updatedAt: string;
  userName: string;
  messages: Array<{ id: string; role: string; content: string; createdAt: string; model?: string }>;
}

function readConversations(): ConversationEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('flux_ai_conversations');
    return raw ? (JSON.parse(raw) as ConversationEntry[]) : [];
  } catch {
    return [];
  }
}

interface Bucket {
  label: string;
  count: number;
}

export default function AnalyticsPage() {
  const { settings, hasSettings, isLoaded } = useSettings();
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);

  useEffect(() => {
    setConversations(readConversations());
    const handler = () => setConversations(readConversations());
    window.addEventListener('storage', handler);
    window.addEventListener('flux_ai:conversations-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('flux_ai:conversations-changed', handler);
    };
  }, []);

  if (!isLoaded) return null;
  if (!hasSettings || !settings) return null;

  const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);
  const userMessages = conversations.reduce(
    (sum, c) => sum + c.messages.filter((m) => m.role === 'user').length,
    0,
  );
  const assistantMessages = conversations.reduce(
    (sum, c) => sum + c.messages.filter((m) => m.role === 'assistant').length,
    0,
  );

  const modelUsage: Record<string, number> = {};
  conversations.forEach((c) => {
    c.messages.forEach((m) => {
      if (m.role === 'assistant' && m.model) {
        modelUsage[m.model] = (modelUsage[m.model] ?? 0) + 1;
      }
    });
  });

  const dailyActivity: Record<string, number> = {};
  conversations.forEach((c) => {
    const day = new Date(c.updatedAt).toISOString().slice(0, 10);
    dailyActivity[day] = (dailyActivity[day] ?? 0) + c.messages.length;
  });
  const last7Days: Bucket[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString(undefined, { weekday: 'short' });
    const key = d.toISOString().slice(0, 10);
    return { label, count: dailyActivity[key] ?? 0 };
  });

  const maxDay = Math.max(1, ...last7Days.map((b) => b.count));

  return (
    <AppShell>
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>
        <Stack spacing={1} sx={{ mb: 4 }}>
          <Typography variant="overline" color="primary.light" sx={{ letterSpacing: '0.12em', fontWeight: 600 }}>
            Analytics
          </Typography>
          <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
            Your activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stats derived from conversations saved in this browser.
          </Typography>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <StatCard icon={<ChatOutlined />} label="Conversations" value={conversations.length} />
          <StatCard icon={<AutoAwesome />} label="Messages" value={totalMessages} subtitle={`${userMessages} from you`} />
          <StatCard icon={<BoltOutlined />} label="AI responses" value={assistantMessages} />
          <StatCard
            icon={<HubOutlined />}
            label="Models used"
            value={Object.keys(modelUsage).length}
            subtitle={Object.keys(modelUsage).slice(0, 2).join(', ') || '—'}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 2 }}>
          <Card sx={{ background: 'rgba(24, 24, 27, 0.6)', border: '1px solid rgba(161, 161, 170, 0.1)' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                <TrendingUpOutlined sx={{ color: 'primary.light' }} />
                <Typography variant="h6" fontWeight={600}>Last 7 days</Typography>
              </Stack>
              <Stack direction="row" alignItems="flex-end" spacing={1.5} sx={{ height: 180 }}>
                {last7Days.map((b) => (
                  <Box key={b.label} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, fontWeight: 600 }}>
                      {b.count}
                    </Typography>
                    <Box
                      sx={{
                        width: '100%',
                        height: `${(b.count / maxDay) * 100}%`,
                        minHeight: 4,
                        borderRadius: 2,
                        background: b.count > 0
                          ? 'linear-gradient(180deg, #a78bfa 0%, #7c3aed 100%)'
                          : 'rgba(161, 161, 170, 0.08)',
                        transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: b.count > 0 ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      {b.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ background: 'rgba(24, 24, 27, 0.6)', border: '1px solid rgba(161, 161, 170, 0.1)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Models used</Typography>
              {Object.keys(modelUsage).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No AI responses recorded yet. Start a chat to see stats here.
                </Typography>
              ) : (
                <Stack spacing={1.2}>
                  {Object.entries(modelUsage)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([model, count]) => (
                      <Box
                        key={model}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          background: 'rgba(161, 161, 170, 0.04)',
                          border: '1px solid rgba(161, 161, 170, 0.08)',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {model}
                          </Typography>
                          <Chip label={count} size="small" sx={{ height: 22, fontSize: 11 }} />
                        </Stack>
                      </Box>
                    ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </AppShell>
  );
}

function StatCard({
  icon, label, value, subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <Card sx={{ background: 'rgba(24, 24, 27, 0.6)', border: '1px solid rgba(161, 161, 170, 0.1)' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.light',
            }}
          >
            {icon}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </Typography>
        </Stack>
        <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
          {value}
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
