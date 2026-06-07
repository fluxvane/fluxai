'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ChatMessage, ChatRequest } from '../types/chat';
import { useSettings } from '../contexts/SettingsContext';

export interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
}

export interface UseChatValue extends ChatState {
  send: (content: string) => Promise<void>;
  abort: () => void;
  clear: () => void;
  setMessages: (messages: ChatMessage[]) => void;
}

const ChatContext = createContext<UseChatValue | undefined>(undefined);

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildRequest(messages: ChatMessage[], model: string): ChatRequest {
  return {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
    temperature: 0.7,
  };
}

type ChatProviderProps = Readonly<React.PropsWithChildren>;

export function ChatProvider(props: ChatProviderProps) {
  const { children } = props;
  const { settings, hasSettings } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  useEffect(() => {
    if (!hasSettings) {
      setMessages([]);
      abortRef.current?.abort();
    }
  }, [hasSettings]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const clear = useCallback(() => {
    abort();
    setMessages([]);
    setError(null);
  }, [abort]);

  const setMessagesExternal = useCallback((next: ChatMessage[]) => {
    abort();
    setMessages(next);
    setError(null);
  }, [abort]);

  const send = useCallback(async (content: string) => {
    if (!settings || !content.trim()) return;
    if (isStreaming) return;

    setError(null);

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    const assistantId = newId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      model: settings.defaultModel,
    };

    const historyBeforeAssistant = [...messages, userMessage];
    setMessages([...historyBeforeAssistant, assistantMessage]);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    const url = `/api/proxy/chat/completions`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildRequest(historyBeforeAssistant, settings.defaultModel)),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }
      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const raw of lines) {
          const line = raw.trim();
          if (!line || line === 'data: [DONE]') continue;
          if (!line.startsWith('data:')) continue;

          const payload = line.slice(5).trim();
          if (!payload) continue;

          try {
            const json = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
              );
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        // user aborted — leave partial content as is
      } else {
        const message = err instanceof Error ? err.message : 'Request failed';
        setError(message);
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  }, [settings, messages, isStreaming]);

  const value = useMemo<UseChatValue>(() => ({
    messages,
    isStreaming,
    error,
    send,
    abort,
    clear,
    setMessages: setMessagesExternal,
  }), [messages, isStreaming, error, send, abort, clear, setMessagesExternal]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): UseChatValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
