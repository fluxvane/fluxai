/**
 * NERA AI Dashboard - Chat Service with Streaming Support
 * Real API integration for chat completions with SSE streaming
 */

import type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
} from '../types';
import { getToken } from '../contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const CHAT_ENDPOINT = `${API_BASE}/api/v1/proxy/chat/completions`;

/**
 * Get auth headers for fetch requests (chatService uses raw fetch, not axios)
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function buildChatRequest(
  messages: ChatMessage[],
  options: ChatOptions,
  stream: boolean,
): ChatCompletionRequest {
  return {
    model: options.model,
    messages,
    stream,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    top_p: options.topP,
    frequency_penalty: options.frequencyPenalty,
    presence_penalty: options.presencePenalty,
    stop: options.stop,
  };
}

function parseErrorPayload(errorText: string): string | null {
  try {
    const parsed = JSON.parse(errorText) as { error?: { message?: string } | string };
    return typeof parsed.error === 'string'
      ? parsed.error
      : parsed.error?.message ?? null;
  } catch {
    return null;
  }
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  const errorText = await response.text();
  if (!errorText) {
    return fallback;
  }

  return parseErrorPayload(errorText) || errorText || fallback;
}

function splitBufferedEvents(buffer: string): { events: string[]; remainder: string } {
  const events = buffer.split('\n\n');
  return {
    events: events.slice(0, -1),
    remainder: events.at(-1) ?? '',
  };
}

function getEventDataLines(event: string): string[] {
  return event
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6).trim());
}

function handleDataLine(
  data: string,
  options: ChatOptions,
  callbacks: StreamCallbacks,
  state: { fullContent: string; lastChunk: ChatCompletionChunk | null },
): boolean {
  if (data === '[DONE]') {
    callbacks.onComplete?.(
      state.fullContent,
      buildCompleteResponse(state.lastChunk, options.model, state.fullContent),
    );
    return true;
  }

  try {
    const chunk = JSON.parse(data) as ChatCompletionChunk;
    state.lastChunk = chunk;
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      state.fullContent += delta.content;
      callbacks.onToken?.(delta.content);
    }
  } catch {
    // Ignore malformed partial lines from upstream providers.
  }

  return false;
}

function buildCompleteResponse(
  lastChunk: ChatCompletionChunk | null,
  fallbackModel: string,
  fullContent: string,
): ChatCompletionResponse {
  return {
    id: lastChunk?.id || '',
    object: 'chat.completion',
    created: lastChunk?.created || Date.now(),
    model: lastChunk?.model || fallbackModel,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: fullContent },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

async function streamChatCompletion(
  request: ChatCompletionRequest,
  options: ChatOptions,
  callbacks: StreamCallbacks,
  abortController?: AbortController,
): Promise<void> {
  callbacks.onStart?.();

  const response = await fetch(CHAT_ENDPOINT, {
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
    throw new Error(await getErrorMessage(response, 'Stream request failed'));
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  const state = {
    fullContent: '',
    lastChunk: null as ChatCompletionChunk | null,
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const split = splitBufferedEvents(buffer);
      buffer = split.remainder;

      for (const event of split.events) {
        for (const data of getEventDataLines(event)) {
          if (handleDataLine(data, options, callbacks, state)) {
            return;
          }
        }
      }
    }

    callbacks.onComplete?.(
      state.fullContent,
      buildCompleteResponse(state.lastChunk, options.model, state.fullContent),
    );
  } finally {
    reader.releaseLock();
  }
}

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
}

export interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullContent: string, response: ChatCompletionResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Send a chat completion request (non-streaming)
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatCompletionResponse> {
  const request = buildChatRequest(messages, options, false);

  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Chat completion failed'));
  }

  return response.json();
}

/**
 * Send a streaming chat completion request using Server-Sent Events
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  options: ChatOptions,
  callbacks: StreamCallbacks
): Promise<void> {
  const request = buildChatRequest(messages, options, true);

  try {
    await streamChatCompletion(request, options, callbacks);
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Abort controller for cancelling streaming requests
 */
export function createAbortController(): AbortController {
  return new AbortController();
}

/**
 * Chat completion with abort support
 */
export async function chatCompletionStreamWithAbort(
  messages: ChatMessage[],
  options: ChatOptions,
  callbacks: StreamCallbacks,
  abortController: AbortController
): Promise<void> {
  const request = buildChatRequest(messages, options, true);

  try {
    await streamChatCompletion(request, options, callbacks, abortController);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Request was cancelled, don't call onError
      return;
    }
    callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

export const chatService = {
  complete: chatCompletion,
  stream: chatCompletionStream,
  streamWithAbort: chatCompletionStreamWithAbort,
  createAbortController,
};

export default chatService;
