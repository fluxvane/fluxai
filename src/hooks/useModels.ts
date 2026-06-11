"use client";

import { useQuery } from "@tanstack/react-query";

export interface ModelItem {
  id: string;
  provider?: string;
  owned_by?: string;
}

async function fetchModels(): Promise<ModelItem[]> {
  const res = await fetch("/api/proxy/models", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load models (${res.status})`);
  const data = (await res.json()) as { data?: ModelItem[] };
  return data.data ?? [];
}

export function useModels(enabled = true) {
  const query = useQuery({
    queryKey: ["models"],
    queryFn: fetchModels,
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return {
    models: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
