/**
 * NERA AI Dashboard - Model Service
 * User-facing model discovery via AI proxy endpoints
 */

import { http } from './http';
import type { AvailableModelsResponse, Model } from '../types';

const API_BASE = '/api/v1/proxy/models';

export interface ListModelsParams {
  provider?: string;
}

export const modelService = {
  /**
   * List all available models
   */
  async list(params?: ListModelsParams): Promise<Model[]> {
    const response = await http.get<AvailableModelsResponse>(API_BASE);
    const models = response.data.models.map((model) => ({
      ...model,
      displayName: model.name,
      provider: model.provider || model.providerType || 'Unknown',
    }));

    if (!params?.provider) {
      return models;
    }

    return models.filter((model) => {
      const provider = model.provider || model.providerType || '';
      return provider.toLowerCase() === params.provider?.toLowerCase();
    });
  },
};

export default modelService;
