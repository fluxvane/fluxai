/**
 * NERA AI Dashboard - RAG Chat Service
 * Integrates with ChatBot module API for RAG-powered conversations
 */

import type {
  RagChatRequest,
  RagChatResponse,
  RagConversation,
  RagChatMessage,
} from '../types';
import { getToken } from '../contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const CHAT_BASE = `${API_BASE}/api/v1/chat`;

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

interface ApiResult<T> {
  isSuccess: boolean;
  data: T;
}

export interface RagStreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
}

/** Non-streaming RAG chat */
async function sendMessage(
  request: RagChatRequest,
): Promise<RagChatResponse> {
  const response = await fetch(`${CHAT_BASE}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Chat request failed (${response.status})`);
  }

  const result: ApiResult<RagChatResponse> = await response.json();
  return result.data;
}

/** Streaming RAG chat via SSE */
async function streamMessage(
  request: RagChatRequest,
  callbacks: RagStreamCallbacks,
  abortController?: AbortController,
): Promise<void> {
  callbacks.onStart?.();

  const response = await fetch(`${CHAT_BASE}/messages/stream`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      Accept: 'text/event-stream',
    },
    credentials: 'include',
    body: JSON.stringify(request),
    signal: abortController?.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Stream request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() ?? '';

      for (const block of lines) {
        const dataLines = block
          .split('\n')
          .filter((l) => l.startsWith('data: '))
          .map((l) => l.slice(6).trim());

        for (const data of dataLines) {
          if (data === '[DONE]') {
            callbacks.onComplete?.(fullContent);
            return;
          }
          fullContent += data;
          callbacks.onToken?.(data);
        }
      }
    }

    callbacks.onComplete?.(fullContent);
  } finally {
    reader.releaseLock();
  }
}

/** List conversations */
async function getConversations(
  limit = 20,
): Promise<RagConversation[]> {
  const response = await fetch(
    `${CHAT_BASE}/conversations?limit=${limit}`,
    {
      headers: getAuthHeaders(),
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations (${response.status})`);
  }

  const result: ApiResult<RagConversation[]> = await response.json();
  return result.data ?? [];
}

/** Get messages for a conversation */
async function getMessages(
  conversationId: string,
  limit?: number,
): Promise<RagChatMessage[]> {
  const params = limit ? `?limit=${limit}` : '';
  const response = await fetch(
    `${CHAT_BASE}/conversations/${conversationId}/messages${params}`,
    {
      headers: getAuthHeaders(),
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch messages (${response.status})`);
  }

  const result: ApiResult<RagChatMessage[]> = await response.json();
  return result.data ?? [];
}

export const ragChatService = {
  sendMessage,
  streamMessage,
  getConversations,
  getMessages,
  createAbortController: () => new AbortController(),
};
