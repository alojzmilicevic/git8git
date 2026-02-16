export interface TokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp in ms
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description: string
  created_at: string
}

export type ApiRequest = {
  type: 'api/request'
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; needsReauth?: boolean }

export type BackgroundRequest =
  | { type: 'auth/status' }
  | { type: 'auth/logout' }
  | { type: 'auth/getToken' }
  | { type: 'auth/connect' }
  | ApiRequest

export type BackgroundResponse =
  | { ok: true; type: 'auth/status'; authenticated: boolean; expiresAt?: number }
  | { ok: true; type: 'auth/logout'; authenticated: false }
  | { ok: true; type: 'auth/getToken'; token: string | null }
  | { ok: true; type: 'auth/connect'; authenticated: true }
  | ApiResponse
  | { ok: false; error: string }
