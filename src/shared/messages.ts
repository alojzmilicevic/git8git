// =============================================================================
// Token Types
// =============================================================================
export interface TokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp in ms
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export type ApiRequest = {
  type: 'api/request'
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; needsReauth?: boolean }

// =============================================================================
// Background Message Types
// =============================================================================

export type BackgroundRequest =
  | { type: 'auth/status' }
  | { type: 'auth/logout' }
  | { type: 'auth/getToken' }
  | ApiRequest

export type BackgroundResponse =
  | { ok: true; type: 'auth/status'; authenticated: boolean; expiresAt?: number }
  | { ok: true; type: 'auth/logout'; authenticated: false }
  | { ok: true; type: 'auth/getToken'; token: string | null }
  | ApiResponse
  | { ok: false; error: string }
