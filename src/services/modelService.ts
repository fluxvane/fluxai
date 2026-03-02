/**
 * NERA AI Dashboard - Model Service
 * Real API integration for model management
 */

import { http } from './http';
import type { Model } from '../types';

const API_BASE = '/api/v1/models';

export interface ListModelsParams {
  provider?: string;
  type?: 'chat' | 'completion' | 'embedding' | 'image' | 'audio';
  includeDeprecated?: boolean;
}

export const modelService = {
  /**
   * List all available models
   */
  async list(params?: ListModelsParams): Promise<Model[]> {
    const queryParams = new URLSearchParams();
    if (params?.provider) queryParams.set('provider', params.provider);
    if (params?.type) queryParams.set('type', params.type);
    if (params?.includeDeprecated) queryParams.set('includeDeprecated', 'true');

    const url = `${API_BASE}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await http.get<Model[]>(url);
    return response.data;
  },

  /**
   * Get a single model by ID
   */
  async getById(id: string): Promise<Model> {
    const response = await http.get<Model>(`${API_BASE}/${id}`);
    return response.data;
  },

  /**
   * Get models grouped by provider
   */
  async getGroupedByProvider(): Promise<Record<string, Model[]>> {
    const response = await http.get<Record<string, Model[]>>(`${API_BASE}/grouped`);
    return response.data;
  },

  /**
   * Get recommended models based on use case
   */
  async getRecommended(useCase: 'chat' | 'coding' | 'analysis' | 'creative'): Promise<Model[]> {
    const response = await http.get<Model[]>(`${API_BASE}/recommended?useCase=${useCase}`);
    return response.data;
  },
};

export default modelService;
