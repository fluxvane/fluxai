/**
 * NERA AI Dashboard - useRagChat Hook
 * Chat state management with RAG knowledge base integration
 */

import { useState, useCallback, useRef } from 'react';
import {
  ragChatService,
  type RagStreamCallbacks,
} from '../services/ragChatService';
import type { RetrievedSource } from '../types';

export interface RagMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  sources?: RetrievedSource[];
  tokens?: number;
  streaming?: boolean;
}

export interface UseRagChatOptions {
  knowledgeBaseId?: string;
  modelId?: string;
  temperature?: number;
  onError?: (error: Error) => void;
}

export interface UseRagChatReturn {
  messages: RagMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  conversationId: string | undefined;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  clearMessages: () => void;
  loadConversation: (id: string) => Promise<void>;
  setKnowledgeBaseId: (id: string | undefined) => void;
}

export function useRagChat(
  options: UseRagChatOptions = {},
): UseRagChatReturn {
  const [messages, setMessages] = useState<RagMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationId, setConversationId] = useState<string>();
  const [error, setError] = useState<Error | null>(null);
  const [kbId, setKbId] = useState(options.knowledgeBaseId);

  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || isStreaming) return;

      const userMsg: RagMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);
      setStreamingContent('');

      abortRef.current = ragChatService.createAbortController();

      const callbacks: RagStreamCallbacks = {
        onStart: () => {
          setIsLoading(false);
          setIsStreaming(true);
        },
        onToken: (token) => {
          setStreamingContent((prev) => prev + token);
        },
        onComplete: (fullContent) => {
          setIsStreaming(false);
          setStreamingContent('');
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: fullContent,
              timestamp: new Date(),
              model: options.modelId,
            },
          ]);
        },
        onError: (err) => {
          setIsLoading(false);
          setIsStreaming(false);
          setStreamingContent('');
          setError(err);
          options.onError?.(err);
        },
      };

      try {
        await ragChatService.streamMessage(
          {
            message: content.trim(),
            conversationId,
            knowledgeBaseId: kbId,
            modelId: options.modelId,
            temperature: options.temperature,
          },
          callbacks,
          abortRef.current,
        );
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          callbacks.onError?.(err);
        }
      }
    },
    [
      isLoading,
      isStreaming,
      conversationId,
      kbId,
      options.modelId,
      options.temperature,
      options.onError,
    ],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (streamingContent) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: streamingContent + ' [stopped]',
          timestamp: new Date(),
        },
      ]);
    }

    setIsStreaming(false);
    setStreamingContent('');
  }, [streamingContent]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
    setStreamingContent('');
    setError(null);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const msgs = await ragChatService.getMessages(id);
      setConversationId(id);
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          timestamp: new Date(m.createdAt),
          model: m.modelId ?? undefined,
          sources: m.sources,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error(String(err)),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setKnowledgeBaseId = useCallback(
    (id: string | undefined) => setKbId(id),
    [],
  );

  return {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    conversationId,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
    loadConversation,
    setKnowledgeBaseId,
  };
}
