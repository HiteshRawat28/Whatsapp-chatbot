import type { AppConfig, Conversation, DashboardData } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options?.headers
    }
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getConfig: () => request<AppConfig>('/api/config'),
  getDashboard: () => request<DashboardData>('/api/dashboard'),
  getConversation: (id: string) => request<Conversation>(`/api/conversations/${id}`),
  createConversation: () =>
    request<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ name: 'Website visitor' })
    }),
  sendCustomerMessage: (id: string, text: string) =>
    request<Conversation>(`/api/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text })
    }),
  takeover: (id: string) =>
    request<Conversation>(`/api/conversations/${id}/takeover`, {
      method: 'POST',
      body: JSON.stringify({ agentName: 'You' })
    }),
  release: (id: string) =>
    request<Conversation>(`/api/conversations/${id}/release`, {
      method: 'POST',
      body: '{}'
    }),
  resolve: (id: string) =>
    request<Conversation>(`/api/conversations/${id}/resolve`, {
      method: 'POST',
      body: '{}'
    }),
  sendAgentMessage: (id: string, text: string) =>
    request<Conversation>(`/api/conversations/${id}/agent-message`, {
      method: 'POST',
      body: JSON.stringify({ text, agentName: 'You' })
    })
};
