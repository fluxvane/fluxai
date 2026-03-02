/**
 * NERA AI Dashboard - useAnalytics Hook
 * Manages analytics and usage data
 */

import { useState, useEffect, useCallback } from 'react';
import type { UsageStats, DailyUsage } from '../types';
import { createHttp } from '../services/http';

const http = createHttp();

export interface AnalyticsData {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  successRate: number;
  activeModels: number;
  dailyUsage: DailyUsage[];
  modelBreakdown: ModelUsage[];
  providerBreakdown: ProviderUsage[];
  recentActivity: ActivityItem[];
}

export interface ModelUsage {
  modelId: string;
  modelName: string;
  requests: number;
  tokens: number;
  cost: number;
  percentage: number;
}

export interface ProviderUsage {
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
}

export interface ActivityItem {
  id: string;
  type: 'request' | 'error' | 'warning' | 'info';
  message: string;
  model?: string;
  timestamp: string;
  duration?: number;
  tokens?: number;
}

export interface UseAnalyticsOptions {
  autoLoad?: boolean;
  refreshInterval?: number; // in milliseconds
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface UseAnalyticsReturn {
  data: AnalyticsData | null;
  stats: UsageStats | null;
  isLoading: boolean;
  error: Error | null;
  loadAnalytics: () => Promise<void>;
  setDateRange: (start: Date, end: Date) => void;
  refresh: () => Promise<void>;
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const { autoLoad = true, refreshInterval } = options;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dateRange, setDateRangeState] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date(),
  });

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      // Analytics API — orgId will be populated server-side via JWT claims
      const [analyticsResponse, statsResponse] = await Promise.all([
        http.get<AnalyticsData>(`/api/v1/analytics/usage/00000000-0000-0000-0000-000000000000?${params}`),
        http.get<UsageStats>(`/api/v1/analytics/cost/00000000-0000-0000-0000-000000000000?${params}`),
      ]);

      setData(analyticsResponse.data);
      setStats(statsResponse.data);
    } catch (err) {
      // On error, set default/mock data for development
      console.warn('Failed to load analytics, using mock data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load analytics'));
      
      // Set mock data for development
      setData(generateMockAnalytics());
      setStats(generateMockStats());
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  const setDateRange = useCallback((start: Date, end: Date) => {
    setDateRangeState({ start, end });
  }, []);

  const refresh = useCallback(async () => {
    await loadAnalytics();
  }, [loadAnalytics]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadAnalytics();
    }
  }, [autoLoad, loadAnalytics]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(loadAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, loadAnalytics]);

  // Reload when date range changes
  useEffect(() => {
    loadAnalytics();
  }, [dateRange, loadAnalytics]);

  return {
    data,
    stats,
    isLoading,
    error,
    loadAnalytics,
    setDateRange,
    refresh,
  };
}

// Mock data generators for development
function generateMockAnalytics(): AnalyticsData {
  const dailyUsage: DailyUsage[] = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dailyUsage.push({
      date: date.toISOString().split('T')[0],
      requests: Math.floor(Math.random() * 500) + 100,
      tokens: Math.floor(Math.random() * 50000) + 10000,
      cost: Math.random() * 50 + 10,
      successRate: Math.random() * 5 + 95,
    });
  }

  return {
    totalRequests: 2847,
    totalTokens: 1234567,
    totalCost: 156.89,
    averageLatency: 245,
    successRate: 99.2,
    activeModels: 5,
    dailyUsage,
    modelBreakdown: [
      { modelId: 'gpt-4', modelName: 'GPT-4', requests: 1200, tokens: 600000, cost: 85, percentage: 42 },
      { modelId: 'gpt-3.5-turbo', modelName: 'GPT-3.5 Turbo', requests: 1000, tokens: 400000, cost: 35, percentage: 35 },
      { modelId: 'claude-3-sonnet', modelName: 'Claude 3 Sonnet', requests: 400, tokens: 150000, cost: 25, percentage: 14 },
      { modelId: 'gemini-pro', modelName: 'Gemini Pro', requests: 247, tokens: 84567, cost: 11.89, percentage: 9 },
    ],
    providerBreakdown: [
      { provider: 'OpenAI', requests: 2200, tokens: 1000000, cost: 120, status: 'healthy', latency: 230 },
      { provider: 'Anthropic', requests: 400, tokens: 150000, cost: 25, status: 'healthy', latency: 280 },
      { provider: 'Google', requests: 247, tokens: 84567, cost: 11.89, status: 'degraded', latency: 450 },
    ],
    recentActivity: [
      { id: '1', type: 'request', message: 'Chat completion request', model: 'gpt-4', timestamp: new Date().toISOString(), duration: 1234, tokens: 567 },
      { id: '2', type: 'request', message: 'Chat completion request', model: 'claude-3-sonnet', timestamp: new Date(Date.now() - 60000).toISOString(), duration: 890, tokens: 234 },
      { id: '3', type: 'warning', message: 'High latency detected', model: 'gemini-pro', timestamp: new Date(Date.now() - 120000).toISOString() },
      { id: '4', type: 'info', message: 'Model cache refreshed', timestamp: new Date(Date.now() - 180000).toISOString() },
      { id: '5', type: 'request', message: 'Chat completion request', model: 'gpt-3.5-turbo', timestamp: new Date(Date.now() - 240000).toISOString(), duration: 456, tokens: 123 },
    ],
  };
}

function generateMockStats(): UsageStats {
  return {
    totalRequests: 2847,
    totalTokens: 1234567,
    totalCost: 156.89,
    successRate: 99.2,
    avgLatencyMs: 245,
  };
}

export default useAnalytics;
