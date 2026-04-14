/**
 * NERA AI Dashboard - useKnowledgeBases Hook
 * Manages knowledge base listing and state
 */

import { useState, useEffect, useCallback } from 'react';
import { knowledgeBaseService } from '../services/knowledgeBaseService';
import type { KnowledgeBase } from '../types';

export interface UseKnowledgeBasesReturn {
  knowledgeBases: KnowledgeBase[];
  selectedKB: KnowledgeBase | undefined;
  isLoading: boolean;
  error: Error | null;
  selectKB: (kb: KnowledgeBase | undefined) => void;
  refresh: () => Promise<void>;
}

export function useKnowledgeBases(): UseKnowledgeBasesReturn {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const kbs = await knowledgeBaseService.list();
      setKnowledgeBases(kbs);
      if (!selectedKB && kbs.length > 0) {
        const defaultKb = kbs.find((kb) => kb.isDefault) ?? kbs[0];
        setSelectedKB(defaultKb);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [selectedKB]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectKB = useCallback(
    (kb: KnowledgeBase | undefined) => setSelectedKB(kb),
    [],
  );

  return {
    knowledgeBases,
    selectedKB,
    isLoading,
    error,
    selectKB,
    refresh,
  };
}
