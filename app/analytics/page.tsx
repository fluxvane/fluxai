"use client";

import React from "react";
import { Box, Stack, Typography, Chip, CircularProgress } from "@mui/material";
import {
  AutoAwesome,
  ChatOutlined,
  BoltOutlined,
  HubOutlined,
  ImageOutlined,
  TokenOutlined,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import GlassPanel from "@/components/aurora/GlassPanel";
import DisplayHeading from "@/components/aurora/DisplayHeading";

// recharts is heavy and only needed here — load it on demand so it stays out
// of first-load JS for this (and every) route.
const DailyChart = dynamic(() => import("@/components/analytics/DailyChart"), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
      <CircularProgress size={20} />
    </Box>
  ),
});

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
  const res = await fetch("/api/analytics", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load analytics");
  return res.json();
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    staleTime: 30_000,
  });

  return (
    <AppShell>
      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 5 },
          width: "100%",
        }}
      >
        <Stack spacing={1} sx={{ mb: 4 }}>
          <Typography
            variant="overline"
            color="primary.light"
            sx={{ letterSpacing: "0.12em", fontWeight: 600 }}
          >
            Analytics
          </Typography>
          <DisplayHeading variant="h3">Your activity</DisplayHeading>
          <Typography variant="body2" sx={{ color: "var(--text-soft)" }}>
            Live stats from your account database.
          </Typography>
        </Stack>

        {isLoading || !data ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress />
          </Box>
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
    label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
    }),
    date: d.date,
    count: d.count,
  }));

  const cards = [
    {
      icon: <ChatOutlined />,
      label: "Conversations",
      value: totals.conversations,
    },
    {
      icon: <AutoAwesome />,
      label: "Messages",
      value: totals.messages,
      subtitle: `${totals.userMessages} from you`,
    },
    {
      icon: <BoltOutlined />,
      label: "AI responses",
      value: totals.assistantMessages,
    },
    { icon: <ImageOutlined />, label: "Images", value: totals.images },
  ];

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 2,
        }}
      >
        {cards.map((c, i) => (
          <Box
            key={c.label}
            sx={{
              animation: "flux-fade-up 0.4s var(--ease-out) both",
              animationDelay: `${i * 0.05}s`,
            }}
          >
            <StatCard {...c} />
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.5fr 1fr" },
          gap: 2,
        }}
      >
        <GlassPanel sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            Last 14 days
          </Typography>
          <Typography variant="caption" sx={{ color: "var(--text-soft)" }}>
            Messages per day
          </Typography>
          <Box sx={{ height: 220, mt: 2 }}>
            <DailyChart data={chartData} />
          </Box>
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 1, color: "var(--text-soft)" }}
          >
            Peak day: {maxDay} message{maxDay === 1 ? "" : "s"}
          </Typography>
        </GlassPanel>

        <Stack spacing={2}>
          <StatCard
            icon={<TokenOutlined />}
            label="Tokens used"
            value={totalTokens}
            subtitle={`${totals.promptTokens} in · ${totals.completionTokens} out`}
          />
          <GlassPanel sx={{ p: 3, flex: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <HubOutlined sx={{ color: "var(--accent)", fontSize: 20 }} />
              <Typography variant="h6" fontWeight={600}>
                Models used
              </Typography>
            </Stack>
            {modelUsage.length === 0 ? (
              <Typography variant="body2" sx={{ color: "var(--text-soft)" }}>
                No AI responses yet. Start a chat to see model stats.
              </Typography>
            ) : (
              <Stack spacing={1.2}>
                {modelUsage.slice(0, 6).map((m) => (
                  <Box
                    key={m.model}
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      background: "rgba(161,161,170,0.04)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          mr: 1,
                        }}
                      >
                        {m.model}
                      </Typography>
                      <Chip
                        label={m.count}
                        size="small"
                        sx={{ height: 22, fontSize: 11 }}
                      />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </GlassPanel>
        </Stack>
      </Box>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <GlassPanel sx={{ p: 3, height: "100%" }}>
      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            background:
              "linear-gradient(135deg, rgba(118,185,0,0.15) 0%, rgba(0,179,122,0.15) 100%)",
            border: "1px solid rgba(118,185,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-2)",
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: "var(--text-soft)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </Typography>
      </Stack>
      <DisplayHeading variant="h4">{value.toLocaleString()}</DisplayHeading>
      {subtitle && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.5,
            fontSize: 11,
            color: "var(--text-soft)",
          }}
        >
          {subtitle}
        </Typography>
      )}
    </GlassPanel>
  );
}
