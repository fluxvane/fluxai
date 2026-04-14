/**
 * NERA AI Dashboard - Conversation Service
 * Real API integration for user conversation and message management
 */

import { http } from './http';
import type {
  Conversation,
  ConversationMessage,
  PaginatedResponse,
} from '../types';

const API_BASE = '/api/v1/conversations';
const CONVERSATION_TYPE_AI = 5;
const MESSAGE_TYPE_TEXT = 1;
const MESSAGE_ROLE_USER = 1;
const MESSAGE_ROLE_ASSISTANT = 2;

interface ConversationSummaryApi {
  id: string;
  title: string;
  type: number;
  status: number;
  createdByUserId: string;
  createdAt?: string | null;
  messageCount: number;
  lastMessageAt?: string | null;
  lastActivityAt?: string | null;
}

interface ConversationDetailApi {
  id: string;
  title: string;
  createdByUserId: string;
  type: number;
  status: number;
  description?: string | null;
  createdAt?: string | null;
  modifiedAt?: string | null;
  messageCount: number;
  lastMessageAt?: string | null;
  lastActivityAt?: string | null;
}

interface ConversationListApiResponse {
  items: ConversationSummaryApi[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface MessageApi {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: number;
  role: number;
  status: number;
  isEdited: boolean;
  createdAt?: string | null;
  editedAt?: string | null;
  aiModelId?: string | null;
}

interface MessageListApiResponse {
  items: MessageApi[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface SendMessageApiResponse {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: number;
  role: number;
  status: number;
  createdAt?: string | null;
}

function mapMessageRole(role: number): ConversationMessage['role'] {
  switch (role) {
    case 2:
      return 'assistant';
    case 3:
      return 'system';
    case 4:
      return 'function';
    default:
      return 'user';
  }
}

function resolveUpdatedAt(
  createdAt?: string | null,
  updatedAt?: string | null,
  lastMessageAt?: string | null,
  lastActivityAt?: string | null,
): string | null {
  return lastActivityAt ?? updatedAt ?? lastMessageAt ?? createdAt ?? null;
}

function mapConversationSummary(api: ConversationSummaryApi): Conversation {
  return {
    id: api.id,
    title: api.title,
    createdByUserId: api.createdByUserId,
    type: api.type,
    status: api.status,
    createdAt: api.createdAt ?? null,
    updatedAt: resolveUpdatedAt(api.createdAt, null, api.lastMessageAt, api.lastActivityAt),
    messageCount: api.messageCount,
    lastMessageAt: api.lastMessageAt ?? null,
    lastActivityAt: api.lastActivityAt ?? null,
  };
}

function mapConversationDetail(api: ConversationDetailApi): Conversation {
  return {
    id: api.id,
    title: api.title,
    createdByUserId: api.createdByUserId,
    type: api.type,
    status: api.status,
    createdAt: api.createdAt ?? null,
    updatedAt: resolveUpdatedAt(api.createdAt, api.modifiedAt, api.lastMessageAt, api.lastActivityAt),
    messageCount: api.messageCount,
    description: api.description ?? null,
    lastMessageAt: api.lastMessageAt ?? null,
    lastActivityAt: api.lastActivityAt ?? null,
  };
}

function mapMessage(api: MessageApi | SendMessageApiResponse): ConversationMessage {
  return {
    id: api.id,
    conversationId: api.conversationId,
    senderId: api.senderId,
    content: api.content,
    type: api.type,
    role: mapMessageRole(api.role),
    status: api.status,
    isEdited: 'isEdited' in api ? api.isEdited : false,
    createdAt: api.createdAt ?? null,
    editedAt: 'editedAt' in api ? api.editedAt ?? null : null,
    aiModelId: 'aiModelId' in api ? api.aiModelId ?? null : null,
  };
}

export interface CreateConversationRequest {
  title: string;
  model: string;
  createdByUserId: string;
  description?: string;
}

export interface UpdateConversationRequest {
  title?: string;
  description?: string;
}

export interface ListConversationsParams {
  userId: string;
  page?: number;
  pageSize?: number;
}

export const conversationService = {
  /**
   * List conversations for the current authenticated user
   */
  async list(params?: ListConversationsParams): Promise<PaginatedResponse<Conversation>> {
    if (!params?.userId) {
      return { items: [], totalCount: 0, page: 1, pageSize: params?.pageSize ?? 20 };
    }

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());

    const url = `${API_BASE}/user/${encodeURIComponent(params.userId)}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await http.get<ConversationListApiResponse>(url);

    return {
      items: response.data.items.map(mapConversationSummary),
      totalCount: response.data.totalCount,
      page: response.data.page,
      pageSize: response.data.pageSize,
    };
  },

  /**
   * Get a single conversation by ID
   */
  async getById(id: string): Promise<Conversation> {
    const response = await http.get<ConversationDetailApi>(`${API_BASE}/${id}`);
    return mapConversationDetail(response.data);
  },

  /**
   * Create a new conversation
   */
  async create(data: CreateConversationRequest): Promise<Conversation> {
    const response = await http.post<{ id: string }>(API_BASE, {
      title: data.title,
      type: CONVERSATION_TYPE_AI,
      createdByUserId: data.createdByUserId,
      description: data.description,
      aiModelId: data.model,
    });

    return this.getById(response.data.id);
  },

  /**
   * Update a conversation
   */
  async update(id: string, data: UpdateConversationRequest): Promise<Conversation> {
    await http.put(`${API_BASE}/${id}`, data);
    return this.getById(id);
  },

  /**
   * Delete a conversation
   */
  async delete(id: string): Promise<void> {
    await http.delete(`${API_BASE}/${id}`);
  },

  /**
   * Get all messages for a conversation
   */
  async getMessages(
    conversationId: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<ConversationMessage>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());

    const url = `${API_BASE}/${conversationId}/messages${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await http.get<MessageListApiResponse>(url);
    const items = [...response.data.items]
      .sort((left, right) => {
        const leftValue = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightValue = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return leftValue - rightValue;
      })
      .map(mapMessage);

    return {
      items,
      totalCount: response.data.totalCount,
      page: response.data.page,
      pageSize: response.data.pageSize,
    };
  },

  /**
   * Add a message to a conversation (for manual additions, not chat completions)
   */
  async addMessage(
    conversationId: string,
    message: { role: ConversationMessage['role']; content: string; modelId?: string }
  ): Promise<ConversationMessage> {
    const response = await http.post<SendMessageApiResponse>(
      `${API_BASE}/${conversationId}/messages`,
      {
        content: message.content,
        type: MESSAGE_TYPE_TEXT,
        role: message.role === 'assistant' ? MESSAGE_ROLE_ASSISTANT : MESSAGE_ROLE_USER,
        aiModelId: message.modelId,
      }
    );
    return mapMessage(response.data);
  },
};

export default conversationService;
