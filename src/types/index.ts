/**
 * NERA AI Dashboard - Type Definitions
 */

// Chat Types
export type MessageRole = 'user' | 'assistant' | 'system' | 'function';

export interface ChatMessage {
  role: MessageRole;
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
  createdByUserId: string;
  type: number;
  status: number;
  createdAt: string | null;
  updatedAt: string | null;
  messageCount: number;
  description?: string | null;
  lastMessageAt?: string | null;
  lastActivityAt?: string | null;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  role: MessageRole;
  content: string;
  type: number;
  status: number;
  isEdited: boolean;
  createdAt: string | null;
  editedAt?: string | null;
  aiModelId?: string | null;
}

// Model Types
export interface Model {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  provider: string;
  providerType?: string;
  contextLength?: number | null;
  contextWindow?: number;
  maxOutputTokens?: number;
  costPerToken?: number | null;
  latency?: number;
  capabilities?: {
    streaming?: boolean;
    vision?: boolean;
    functionCalling?: boolean;
    codeGeneration?: boolean;
    codeInterpreter?: boolean;
    recommended?: boolean;
  };
  pricing?: {
    inputPer1M?: number;
    outputPer1M?: number;
  };
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

// RAG / ChatBot Types
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  isDefault: boolean;
  isActive: boolean;
  systemPrompt?: string | null;
  maxTokensPerQuery: number;
  topKResults: number;
  similarityThreshold: number;
  documentCount: number;
  totalChunks: number;
  createdAt: string;
  lastIndexedAt?: string | null;
}

export interface KnowledgeBaseStats {
  knowledgeBaseId: string;
  documentCount: number;
  activeDocumentCount: number;
  failedDocumentCount: number;
  totalChunks: number;
  totalSizeBytes: number;
  lastIndexedAt?: string | null;
}

export interface IndexedDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  description?: string | null;
  source: number;
  status: number;
  filePath?: string | null;
  fileName?: string | null;
  contentType: string;
  fileSizeBytes: number;
  totalChunks: number;
  embeddingModel: string;
  isSearchable: boolean;
  indexedAt?: string | null;
  processingError?: string | null;
  createdAt: string;
}

export interface RetrievedSource {
  documentId: string;
  documentTitle: string;
  content: string;
  similarity: number;
}

export interface RagChatRequest {
  message: string;
  conversationId?: string;
  knowledgeBaseId?: string;
  modelId?: string;
  temperature?: number;
  stream?: boolean;
}

export interface RagChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  sources: RetrievedSource[];
  createdAt: string;
}

export interface RagConversation {
  id: string;
  title: string;
  knowledgeBaseId?: string | null;
  messageCount: number;
  createdAt: string;
  lastMessageAt?: string | null;
}

export interface RagChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  modelId?: string | null;
  sources: RetrievedSource[];
  createdAt: string;
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
}

export interface AvailableModelsResponse {
  models: Model[];
  totalCount: number;
}
