import { api } from '../lib/apiClient';

export const uploadImageDataUrl = async (dataUrl: string) => {
  return api.post<{ url: string }>('/uploads/image', { dataUrl });
};

