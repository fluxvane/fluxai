/**
 * NERA AI Dashboard - useModels Hook
 * Manages model listing and selection
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { modelService } from '../services/modelService';
import type { Model } from '../types';

export interface UseModelsOptions {
  autoLoad?: boolean;
  defaultModelId?: string;
}

export interface UseModelsReturn {
  models: Model[];
  selectedModel: Model | null;
  groupedModels: Record<string, Model[]>;
  recommendedModels: Model[];
  isLoading: boolean;
  error: Error | null;
  loadModels: () => Promise<void>;
  selectModel: (modelId: string) => void;
  getModelById: (modelId: string) => Model | undefined;
  refresh: () => Promise<void>;
}

export function useModels(options: UseModelsOptions = {}): UseModelsReturn {
  const { autoLoad = true, defaultModelId } = options;

  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(
    defaultModelId ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await modelService.list();
      setModels(response);
      
      // Auto-select first model if none selected
      if (!selectedModelId && response.length > 0) {
        setSelectedModelId(response[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load models'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedModelId]);

  const selectModel = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
  }, []);

  const getModelById = useCallback(
    (modelId: string): Model | undefined => {
      return models.find((m) => m.id === modelId);
    },
    [models]
  );

  const selectedModel = useMemo(() => {
    if (!selectedModelId) return null;
    return models.find((m) => m.id === selectedModelId) ?? null;
  }, [models, selectedModelId]);

  const groupedModels = useMemo(() => {
    return models.reduce((acc, model) => {
      const provider = model.provider || 'Other';
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
    }, {} as Record<string, Model[]>);
  }, [models]);

  const recommendedModels = useMemo(() => {
    return models.filter(
      (m) =>
        m.id.includes('gpt-4') ||
        m.id.includes('claude') ||
        m.id.includes('gemini')
    );
  }, [models]);

  const refresh = useCallback(async () => {
    await loadModels();
  }, [loadModels]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadModels();
    }
  }, [autoLoad, loadModels]);

  return {
    models,
    selectedModel,
    groupedModels,
    recommendedModels,
    isLoading,
    error,
    loadModels,
    selectModel,
    getModelById,
    refresh,
  };
}

export default useModels;
