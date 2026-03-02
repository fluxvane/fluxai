/**
 * NERA AI Dashboard - useConversations Hook
 * Manages conversation list and CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import { conversationService } from '../services/conversationService';
import type { Conversation, ConversationMessage, ChatMessage } from '../types';

export interface UseConversationsOptions {
  autoLoad?: boolean;
  pageSize?: number;
}

export interface UseConversationsReturn {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ConversationMessage[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  page: number;
  hasMore: boolean;
  // CRUD
  loadConversations: () => Promise<void>;
  loadMore: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  createConversation: (title: string, modelId?: string) => Promise<Conversation>;
  updateConversation: (id: string, data: Partial<Conversation>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  // Messages
  addMessage: (conversationId: string, message: ChatMessage) => Promise<ConversationMessage>;
  clearMessages: (conversationId: string) => Promise<void>;
  // Export
  exportConversation: (id: string, format: 'json' | 'markdown') => Promise<Blob>;
  // Selection
  selectConversation: (conversation: Conversation | null) => void;
  refresh: () => Promise<void>;
}

export function useConversations(
  options: UseConversationsOptions = {}
): UseConversationsReturn {
  const { autoLoad = true, pageSize = 20 } = options;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await conversationService.list({ page: 1, pageSize });
      setConversations(response.items);
      setTotalCount(response.totalCount);
      setPage(1);
      setHasMore(response.items.length < response.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversations'));
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const response = await conversationService.list({ page: nextPage, pageSize });
      setConversations((prev) => [...prev, ...response.items]);
      setPage(nextPage);
      setHasMore(conversations.length + response.items.length < response.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more conversations'));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, pageSize, conversations.length]);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [conversation, messagesResponse] = await Promise.all([
        conversationService.getById(id),
        conversationService.getMessages(id),
      ]);
      setCurrentConversation(conversation);
      setMessages(messagesResponse.items);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversation'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConversation = useCallback(
    async (title: string, modelId?: string): Promise<Conversation> => {
      setIsLoading(true);
      setError(null);
      try {
        const conversation = await conversationService.create({ title, model: modelId ?? 'gpt-4' });
        setConversations((prev) => [conversation, ...prev]);
        setTotalCount((prev) => prev + 1);
        return conversation;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create conversation');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateConversation = useCallback(
    async (id: string, data: Partial<Conversation>) => {
      setIsLoading(true);
      setError(null);
      try {
        const updated = await conversationService.update(id, data);
        setConversations((prev) =>
          prev.map((conv) => (conv.id === id ? updated : conv))
        );
        if (currentConversation?.id === id) {
          setCurrentConversation(updated);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update conversation'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentConversation?.id]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await conversationService.delete(id);
        setConversations((prev) => prev.filter((conv) => conv.id !== id));
        setTotalCount((prev) => prev - 1);
        if (currentConversation?.id === id) {
          setCurrentConversation(null);
          setMessages([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete conversation'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentConversation?.id]
  );

  const addMessage = useCallback(
    async (conversationId: string, message: ChatMessage): Promise<ConversationMessage> => {
      try {
        const newMessage = await conversationService.addMessage(conversationId, message);
        if (currentConversation?.id === conversationId) {
          setMessages((prev) => [...prev, newMessage]);
        }
        // Update conversation's updatedAt
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, updatedAt: new Date().toISOString(), messageCount: conv.messageCount + 1 }
              : conv
          )
        );
        return newMessage;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to add message');
      }
    },
    [currentConversation?.id]
  );

  const clearMessages = useCallback(
    async (conversationId: string) => {
      try {
        await conversationService.clearMessages(conversationId);
        if (currentConversation?.id === conversationId) {
          setMessages([]);
        }
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, messageCount: 0 } : conv
          )
        );
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to clear messages');
      }
    },
    [currentConversation?.id]
  );

  const exportConversation = useCallback(
    async (id: string, format: 'json' | 'markdown'): Promise<Blob> => {
      return conversationService.export(id, format);
    },
    []
  );

  const selectConversation = useCallback(
    (conversation: Conversation | null) => {
      setCurrentConversation(conversation);
      if (conversation) {
        loadConversation(conversation.id);
      } else {
        setMessages([]);
      }
    },
    [loadConversation]
  );

  const refresh = useCallback(async () => {
    await loadConversations();
    if (currentConversation) {
      await loadConversation(currentConversation.id);
    }
  }, [loadConversations, loadConversation, currentConversation]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadConversations();
    }
  }, [autoLoad, loadConversations]);

  return {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    totalCount,
    page,
    hasMore,
    loadConversations,
    loadMore,
    loadConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    clearMessages,
    exportConversation,
    selectConversation,
    refresh,
  };
}

export default useConversations;
