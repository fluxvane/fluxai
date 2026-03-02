/**
 * NERA AI Dashboard - Type Definitions
 */

// Chat Types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<ChatMessage>;
    finish_reason: string | null;
  }>;
}

// Conversation Types
export interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
  workspaceId?: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  tokens?: number;
  model?: string;
}

// Model Types
export interface ModelCapabilities {
  streaming?: boolean;
  functionCalling?: boolean;
  vision?: boolean;
  jsonMode?: boolean;
  codeInterpreter?: boolean;
  recommended?: boolean;
}

export interface ModelPricing {
  inputPer1M?: number;
  outputPer1M?: number;
  inputPer1k?: number;
  outputPer1k?: number;
}

export interface Model {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  provider: string;
  type: 'chat' | 'completion' | 'embedding' | 'image' | 'audio';
  maxTokens?: number;
  maxOutputTokens?: number;
  contextWindow?: number;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  latency?: number;
  capabilities?: ModelCapabilities;
  pricing?: ModelPricing;
  isActive?: boolean;
}

// Analytics Types
export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  successRate: number;
  avgLatencyMs: number;
}

export interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
  successRate: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
