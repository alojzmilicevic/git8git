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
  delete: <T>(endpoint: string, body?: unknown) => apiRequest<T>(endpoint, { method: 'DELETE', body }),
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

export interface PushWorkflowResult {
  commitSha: string | null
  changed: boolean
}

export interface PullWorkflowResult {
  content: string
  found: boolean
}

export interface DeleteWorkflowResult {
  commitSha: string
}

export const githubApi = {
  listRepos: () => api.get<Repo[]>('/api/github/repos'),
  listBranches: (repoFullName: string) => api.get<Branch[]>(`/api/github/repos/${repoFullName}/branches`),
  pushWorkflow: (repo: string, body: { branch: string; message: string; workflowId: string; workflowName: string; workflowJson: string }) =>
    api.post<PushWorkflowResult>(`/api/github/repos/${repo}/workflows/push`, body),
  pullWorkflow: (repo: string, workflowId: string, branch: string) =>
    api.get<PullWorkflowResult>(`/api/github/repos/${repo}/workflows/${encodeURIComponent(workflowId)}?branch=${encodeURIComponent(branch)}`),
  deleteWorkflow: (repo: string, workflowId: string, params: { branch: string; workflowName: string }) =>
    api.delete<DeleteWorkflowResult>(`/api/github/repos/${repo}/workflows/${encodeURIComponent(workflowId)}?branch=${encodeURIComponent(params.branch)}&workflowName=${encodeURIComponent(params.workflowName)}`),
}
