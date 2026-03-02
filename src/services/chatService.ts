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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const CHAT_ENDPOINT = `${API_BASE}/api/v1/proxy/chat/completions`;

/**
 * Get auth headers for fetch requests (chatService uses raw fetch, not axios)
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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
  const request: ChatCompletionRequest = {
    model: options.model,
    messages,
    stream: false,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    top_p: options.topP,
    frequency_penalty: options.frequencyPenalty,
    presence_penalty: options.presencePenalty,
    stop: options.stop,
  };

  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Chat completion failed');
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
  const request: ChatCompletionRequest = {
    model: options.model,
    messages,
    stream: true,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    top_p: options.topP,
    frequency_penalty: options.frequencyPenalty,
    presence_penalty: options.presencePenalty,
    stop: options.stop,
  };

  callbacks.onStart?.();

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        Accept: 'text/event-stream',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Stream request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let lastChunk: ChatCompletionChunk | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            // Stream complete
            const completeResponse: ChatCompletionResponse = {
              id: lastChunk?.id || '',
              object: 'chat.completion',
              created: lastChunk?.created || Date.now(),
              model: lastChunk?.model || options.model,
              choices: [
                {
                  index: 0,
                  message: { role: 'assistant', content: fullContent },
                  finish_reason: 'stop',
                },
              ],
              usage: {
                prompt_tokens: 0, // Not available in streaming
                completion_tokens: 0,
                total_tokens: 0,
              },
            };
            callbacks.onComplete?.(fullContent, completeResponse);
            return;
          }

          try {
            const chunk: ChatCompletionChunk = JSON.parse(data);
            lastChunk = chunk;

            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              fullContent += delta.content;
              callbacks.onToken?.(delta.content);
            }
          } catch (e) {
            // Skip invalid JSON lines
            console.warn('Invalid SSE data:', data);
          }
        }
      }
    }

    // If we reach here without [DONE], still complete
    const completeResponse: ChatCompletionResponse = {
      id: lastChunk?.id || '',
      object: 'chat.completion',
      created: lastChunk?.created || Date.now(),
      model: lastChunk?.model || options.model,
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
    callbacks.onComplete?.(fullContent, completeResponse);
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
  const request: ChatCompletionRequest = {
    model: options.model,
    messages,
    stream: true,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    top_p: options.topP,
    frequency_penalty: options.frequencyPenalty,
    presence_penalty: options.presencePenalty,
    stop: options.stop,
  };

  callbacks.onStart?.();

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        Accept: 'text/event-stream',
      },
      credentials: 'include',
      body: JSON.stringify(request),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Stream request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let lastChunk: ChatCompletionChunk | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              const completeResponse: ChatCompletionResponse = {
                id: lastChunk?.id || '',
                object: 'chat.completion',
                created: lastChunk?.created || Date.now(),
                model: lastChunk?.model || options.model,
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
              callbacks.onComplete?.(fullContent, completeResponse);
              return;
            }

            try {
              const chunk: ChatCompletionChunk = JSON.parse(data);
              lastChunk = chunk;

              const delta = chunk.choices[0]?.delta;
              if (delta?.content) {
                fullContent += delta.content;
                callbacks.onToken?.(delta.content);
              }
            } catch (e) {
              console.warn('Invalid SSE data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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
