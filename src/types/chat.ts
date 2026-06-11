export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  reasoning?: string;
  createdAt: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface ChatRequest {
  model: string;
  messages: Array<{ role: ChatRole; content: string }>;
  stream: boolean;
  temperature?: number;
  stream_options?: { include_usage: boolean };
}

export interface ModelInfo {
  id: string;
  ownedBy?: string;
  provider?: string;
}

export interface ModelsResponse {
  object: string;
  data: ModelInfo[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  model: string;
  preview: string;
}

export interface AnalyticsBucket {
  label: string;
  value: number;
}
