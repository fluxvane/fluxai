/**
 * NERA AI Dashboard - Knowledge Base Service
 * API integration for ChatBot RAG knowledge base management
 */

import { http } from './http';
import type {
  KnowledgeBase,
  KnowledgeBaseStats,
  IndexedDocument,
} from '../types';

interface ApiResult<T> {
  isSuccess: boolean;
  data: T;
}

const KB_BASE = '/api/v1/knowledge-bases';

export const knowledgeBaseService = {
  async list(): Promise<KnowledgeBase[]> {
    const res = await http.get<ApiResult<KnowledgeBase[]>>(KB_BASE);
    return res.data.data ?? [];
  },

  async create(request: {
    name: string;
    description?: string;
    icon?: string;
    systemPrompt?: string;
    maxTokensPerQuery?: number;
    topKResults?: number;
    similarityThreshold?: number;
  }): Promise<KnowledgeBase> {
    const res = await http.post<ApiResult<KnowledgeBase>>(KB_BASE, request);
    return res.data.data;
  },

  async update(
    id: string,
    request: Partial<{
      name: string;
      description: string;
      icon: string;
      systemPrompt: string;
      maxTokensPerQuery: number;
      topKResults: number;
      similarityThreshold: number;
      isActive: boolean;
    }>,
  ): Promise<KnowledgeBase> {
    const res = await http.put<ApiResult<KnowledgeBase>>(
      `${KB_BASE}/${id}`,
      request,
    );
    return res.data.data;
  },

  async getDocuments(kbId: string): Promise<IndexedDocument[]> {
    const res = await http.get<ApiResult<IndexedDocument[]>>(
      `${KB_BASE}/${kbId}/documents`,
    );
    return res.data.data ?? [];
  },

  async getStats(kbId: string): Promise<KnowledgeBaseStats> {
    const res = await http.get<ApiResult<KnowledgeBaseStats>>(
      `${KB_BASE}/${kbId}/stats`,
    );
    return res.data.data;
  },

  async indexDocument(
    kbId: string,
    request: {
      title: string;
      content: string;
      description?: string;
      filePath?: string;
      fileName?: string;
      contentType?: string;
      chunkSize?: number;
      chunkOverlap?: number;
    },
  ): Promise<IndexedDocument> {
    const res = await http.post<ApiResult<IndexedDocument>>(
      `${KB_BASE}/${kbId}/documents`,
      { ...request, knowledgeBaseId: kbId },
    );
    return res.data.data;
  },

  async indexProject(
    kbId: string,
    request: {
      projectPath: string;
      fileExtensions?: string[];
      excludePatterns?: string[];
      chunkSize?: number;
      chunkOverlap?: number;
    },
  ): Promise<{
    knowledgeBaseId: string;
    projectPath: string;
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    totalChunks: number;
    status: string;
    errorMessage?: string;
  }> {
    const res = await http.post<
      ApiResult<{
        knowledgeBaseId: string;
        projectPath: string;
        totalFiles: number;
        processedFiles: number;
        failedFiles: number;
        totalChunks: number;
        status: string;
        errorMessage?: string;
      }>
    >(`${KB_BASE}/${kbId}/documents/index-project`, {
      ...request,
      knowledgeBaseId: kbId,
    });
    return res.data.data;
  },
};
