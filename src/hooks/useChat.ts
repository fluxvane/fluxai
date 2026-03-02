/**
 * NERA AI Dashboard - useChat Hook
 * Manages chat state and streaming
 */

import { useState, useCallback, useRef } from 'react';
import { chatService, type StreamCallbacks } from '../services/chatService';
import type { ChatMessage } from '../types';

export interface UseChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  onError?: (error: Error) => void;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  clearMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  regenerateLastResponse: () => Promise<void>;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (options.systemPrompt) {
      return [{ role: 'system', content: options.systemPrompt }];
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || isStreaming) return;

      const userMessage: ChatMessage = { role: 'user', content: content.trim() };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      setStreamingContent('');

      const allMessages = [...messages, userMessage];
      abortControllerRef.current = chatService.createAbortController();

      const callbacks: StreamCallbacks = {
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
            { role: 'assistant', content: fullContent },
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
        await chatService.streamWithAbort(
          allMessages,
          {
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
          },
          callbacks,
          abortControllerRef.current
        );
      } catch (err) {
        // Error already handled in callbacks
      }
    },
    [messages, isLoading, isStreaming, options]
  );

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Add partial content as a message
    if (streamingContent) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: streamingContent + ' [interrupted]' },
      ]);
    }
    
    setIsStreaming(false);
    setStreamingContent('');
  }, [streamingContent]);

  const clearMessages = useCallback(() => {
    if (options.systemPrompt) {
      setMessages([{ role: 'system', content: options.systemPrompt }]);
    } else {
      setMessages([]);
    }
    setStreamingContent('');
    setError(null);
  }, [options.systemPrompt]);

  const regenerateLastResponse = useCallback(async () => {
    if (messages.length < 2) return;

    // Find the last user message
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;

    // Remove messages after (and including) any assistant response after the last user message
    const lastUserMessage = messages[lastUserMessageIndex];
    setMessages(messages.slice(0, lastUserMessageIndex));

    // Resend the message
    await sendMessage(lastUserMessage.content);
  }, [messages, sendMessage]);

  return {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
    setMessages,
    regenerateLastResponse,
  };
}

export default useChat;
