import { api } from '../lib/apiClient';

export type TikuSearchRequest = {
  question: string;
  options?: string[];
  type?: number;
  use?: string;
  wannengToken?: string;
  icodefToken?: string;
  enncyToken?: string;
  aidianYToken?: string;
  lemonToken?: string;
  tikuhaiToken?: string;
};

export type TikuSearchResponse = {
  question?: string;
  options?: string[];
  type?: number;
  answer?: {
    answerKey?: string[];
    answerText?: string;
    bestAnswer?: string[];
  };
};

export const checkTikuAdapterStatus = async () => {
  return api.get<{ connected: boolean; adapterBaseUrl: string; message: string }>('/tiku-adapter/status');
};

export const searchByTikuAdapter = async (payload: TikuSearchRequest) => {
  return api.post<TikuSearchResponse>('/tiku-adapter/search', payload);
};
