const API_BASE_URL = 'http://localhost:3000/api';

let currentToken: string | null = null;

export const setApiToken = (token: string | null) => {
  currentToken = token;
};

export const apiFetch = async <T = unknown>(endpoint: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '请求失败');
  }

  // Handle empty responses
  if (response.status === 204) return null as T;

  return (await response.json()) as T;
};

export const api = {
  get: <T = unknown>(endpoint: string) => apiFetch<T>(endpoint),
  post: <T = unknown>(endpoint: string, data: unknown) => apiFetch<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T = unknown>(endpoint: string, data: unknown) => apiFetch<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T = unknown>(endpoint: string, data: unknown) => apiFetch<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T = unknown>(endpoint: string) => apiFetch<T>(endpoint, { method: 'DELETE' }),
};
