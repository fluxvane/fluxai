"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import type { ChatMessage, ChatRequest } from "../types/chat";
import { useAuth } from "../contexts/AuthContext";
import { splitThink } from "../lib/think";

export interface UseChatValue {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  model: string;
  conversationId: string | null;
  setModel: (model: string) => void;
  send: (content: string, modelOverride?: string) => Promise<void>;
  regenerate: () => Promise<void>;
  abort: () => void;
  newChat: () => void;
  loadConversation: (id: string) => Promise<void>;
}

const ChatContext = createContext<UseChatValue | undefined>(undefined);

const CONVERSATIONS_CHANGED = "flux_ai:conversations-changed";

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildRequest(history: ChatMessage[], model: string): ChatRequest {
  return {
    model,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
    temperature: 0.7,
    stream_options: { include_usage: true },
  };
}

function notifyConversationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CONVERSATIONS_CHANGED));
  }
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, hasConfig, config } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  // Seed the model from the saved config default once it loads.
  useEffect(() => {
    if (config?.defaultModel) setModel(config.defaultModel);
  }, [config?.defaultModel]);

  // Reset everything on sign-out.
  useEffect(() => {
    if (!user) {
      abortRef.current?.abort();
      setMessages([]);
      setConversationId(null);
      setError(null);
      setIsStreaming(false);
    }
  }, [user]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const newChat = useCallback(() => {
    abort();
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, [abort]);

  const persist = useCallback(async (id: string, msgs: ChatMessage[]) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgs.map((m) => ({
            role: m.role,
            content: m.content,
            reasoning: m.reasoning ?? null,
            model: m.model ?? null,
            promptTokens: m.promptTokens ?? null,
            completionTokens: m.completionTokens ?? null,
          })),
        }),
      });
      notifyConversationsChanged();
    } catch {
      /* best-effort persistence */
    }
  }, []);

  const ensureConversation = useCallback(
    async (title: string, usedModel: string): Promise<string | null> => {
      if (conversationId) return conversationId;
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.slice(0, 80), model: usedModel }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { conversation: { id: string } };
        setConversationId(data.conversation.id);
        notifyConversationsChanged();
        return data.conversation.id;
      } catch {
        return null;
      }
    },
    [conversationId],
  );

  const runStream = useCallback(
    async (
      history: ChatMessage[],
      assistantId: string,
      usedModel: string,
      convId: string | null,
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      setError(null);

      let rawContent = "";
      let rawReasoning = "";
      let promptTokens: number | undefined;
      let completionTokens: number | undefined;

      const applyDelta = () => {
        const { answer, think } = splitThink(rawContent);
        const reasoning = (rawReasoning + (think ? `\n${think}` : "")).trim();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: answer, reasoning: reasoning || undefined }
              : m,
          ),
        );
      };

      try {
        const response = await fetch("/api/proxy/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRequest(history, usedModel)),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(humanizeError(response.status, text));
        }
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const raw of lines) {
            const line = raw.trim();
            if (!line || !line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{
                  delta?: { content?: string; reasoning_content?: string };
                }>;
                usage?: { prompt_tokens?: number; completion_tokens?: number };
              };
              const delta = json.choices?.[0]?.delta;
              if (delta?.reasoning_content)
                rawReasoning += delta.reasoning_content;
              if (delta?.content) rawContent += delta.content;
              if (json.usage) {
                promptTokens = json.usage.prompt_tokens ?? promptTokens;
                completionTokens =
                  json.usage.completion_tokens ?? completionTokens;
              }
              if (delta?.content || delta?.reasoning_content) applyDelta();
            } catch {
              /* ignore malformed chunk */
            }
          }
        }

        // Finalize token counts on the assistant message.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, promptTokens, completionTokens } : m,
          ),
        );
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Request failed");
        }
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
        if (convId) void persist(convId, messagesRef.current);
      }
    },
    [persist],
  );

  const send = useCallback(
    async (content: string, modelOverride?: string) => {
      if (!hasConfig || !content.trim() || isStreaming) return;
      const usedModel = modelOverride ?? model;

      const userMessage: ChatMessage = {
        id: newId(),
        role: "user",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      const assistantId = newId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        model: usedModel,
      };

      const history = [...messagesRef.current, userMessage];
      setMessages([...history, assistantMessage]);

      const convId = await ensureConversation(userMessage.content, usedModel);
      await runStream(history, assistantId, usedModel, convId);
    },
    [hasConfig, isStreaming, model, ensureConversation, runStream],
  );

  const regenerate = useCallback(async () => {
    if (isStreaming) return;
    const current = messagesRef.current;
    // Find the last user message and drop everything after it.
    let lastUserIdx = -1;
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;
    const userMessage = current[lastUserIdx];
    const history = current.slice(0, lastUserIdx + 1);
    const assistantId = newId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      model,
    };
    setMessages([...history, assistantMessage]);
    await runStream(history, assistantId, model, conversationId);
    void userMessage;
  }, [isStreaming, model, conversationId, runStream]);

  const loadConversation = useCallback(
    async (id: string) => {
      abort();
      try {
        const res = await fetch(`/api/conversations/${id}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          conversation: { id: string; model: string; messages: ChatMessage[] };
        };
        setConversationId(data.conversation.id);
        setModel(data.conversation.model || model);
        setMessages(data.conversation.messages);
        setError(null);
      } catch {
        /* ignore */
      }
    },
    [abort, model],
  );

  const value = useMemo<UseChatValue>(
    () => ({
      messages,
      isStreaming,
      error,
      model,
      conversationId,
      setModel,
      send,
      regenerate,
      abort,
      newChat,
      loadConversation,
    }),
    [
      messages,
      isStreaming,
      error,
      model,
      conversationId,
      send,
      regenerate,
      abort,
      newChat,
      loadConversation,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

function humanizeError(status: number, text: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    detail =
      (typeof parsed.error === "string"
        ? parsed.error
        : parsed.error?.message) ||
      parsed.message ||
      "";
  } catch {
    detail = text.slice(0, 200);
  }
  if (status === 401)
    return "Your session or proxy configuration is invalid. Check Settings.";
  if (status === 429) return "Rate limited by the provider. Try again shortly.";
  if (status === 502) return detail || "Could not reach the upstream provider.";
  return detail || `Request failed (${status}).`;
}

export function useChat(): UseChatValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
