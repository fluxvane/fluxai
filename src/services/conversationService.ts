/**
 * NERA AI Dashboard - Conversation Service
 * Real API integration for conversation management
 */

import { http } from './http';
import type {
  Conversation,
  ConversationMessage,
  PaginatedResponse,
} from '../types';

const API_BASE = '/api/v1/conversations';

export interface CreateConversationRequest {
  title?: string;
  model: string;
  workspaceId?: string;
  systemPrompt?: string;
}

export interface UpdateConversationRequest {
  title?: string;
}

export interface ListConversationsParams {
  page?: number;
  pageSize?: number;
  workspaceId?: string;
  search?: string;
}

export const conversationService = {
  /**
   * List all conversations with pagination
   */
  async list(params?: ListConversationsParams): Promise<PaginatedResponse<Conversation>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.workspaceId) queryParams.set('workspaceId', params.workspaceId);
    if (params?.search) queryParams.set('search', params.search);

    const url = `${API_BASE}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await http.get<PaginatedResponse<Conversation>>(url);
    return response.data;
  },

  /**
   * Get a single conversation by ID
   */
  async getById(id: string): Promise<Conversation> {
    const response = await http.get<Conversation>(`${API_BASE}/${id}`);
    return response.data;
  },

  /**
   * Create a new conversation
   */
  async create(data: CreateConversationRequest): Promise<Conversation> {
    const response = await http.post<Conversation>(API_BASE, data);
    return response.data;
  },

  /**
   * Update a conversation
   */
  async update(id: string, data: UpdateConversationRequest): Promise<Conversation> {
    const response = await http.put<Conversation>(`${API_BASE}/${id}`, data);
    return response.data;
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
    const response = await http.get<PaginatedResponse<ConversationMessage>>(url);
    return response.data;
  },

  /**
   * Add a message to a conversation (for manual additions, not chat completions)
   */
  async addMessage(
    conversationId: string,
    message: { role: 'user' | 'assistant' | 'system'; content: string }
  ): Promise<ConversationMessage> {
    const response = await http.post<ConversationMessage>(
      `${API_BASE}/${conversationId}/messages`,
      message
    );
    return response.data;
  },

  /**
   * Clear all messages in a conversation
   */
  async clearMessages(conversationId: string): Promise<void> {
    await http.delete(`${API_BASE}/${conversationId}/messages`);
  },

  /**
   * Export conversation as JSON or markdown
   */
  async export(conversationId: string, format: 'json' | 'markdown'): Promise<Blob> {
    const response = await http.get<Blob>(`${API_BASE}/${conversationId}/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default conversationService;
