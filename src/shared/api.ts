import type { ApiRequest, ApiResponse } from './messages'

export async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: unknown
  } = {}
): Promise<T> {
  try {
    const response = await chrome.runtime.sendMessage<ApiRequest, ApiResponse<T>>({
      type: 'api/request',
      endpoint,
      method: options.method || 'GET',
      body: options.body,
    })

    if (!response) {
      throw new Error('No response from background script')
    }

    if (!response.ok) {
      throw new Error(response.error || 'API request failed')
    }

    return response.data as T
  } catch (error) {
    // Don't log here - let callers decide how to handle (some 404s are expected)
    throw error
  }
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) => apiRequest<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown) => apiRequest<T>(endpoint, { method: 'PUT', body }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
}

export interface Repo {
  id: number
  name: string
  fullName: string
  owner: string
  private: boolean
  defaultBranch: string
}

export interface Branch {
  name: string
}

export const githubApi = {
  listRepos: () => api.get<Repo[]>('/api/github/repos'),
  listBranches: (repoFullName: string) => api.get<Branch[]>(`/api/github/repos/${repoFullName}/branches`),
  getFileContent: (repoFullName: string, path: string, ref?: string) =>
    api.get<{ content: string; sha: string }>(`/api/github/repos/${repoFullName}/contents/${path}${ref ? `?ref=${ref}` : ''}`),
  saveFile: (repoFullName: string, path: string, content: string, message: string, branch?: string, sha?: string) =>
    api.put<{ changed: boolean; sha: string; path: string }>(`/api/github/repos/${repoFullName}/contents/${path}`, { content, message, branch, sha }),
}
