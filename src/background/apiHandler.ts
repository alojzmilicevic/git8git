
import type { ApiRequest, ApiResponse } from '../shared/messages'
import { getValidAccessToken, clearTokenData } from './tokenManager'

const API_BASE = 'http://localhost:3000'

export async function handleApiRequest<T>(request: ApiRequest): Promise<ApiResponse<T>> {
  const { endpoint, method, body } = request

  const token = await getValidAccessToken()
  
  
  if (!token) {
    return { 
      ok: false, 
      error: 'Not authenticated', 
      needsReauth: true 
    }
  }

  try {
    const response = await makeAuthenticatedRequest<T>(endpoint, method, body, token)
    
    if (response.ok === false && response.needsReauth) {
      await clearTokenData()
      return response
    }

    return response
  } catch (error) {
    console.error('[apiHandler] Request error:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Request failed',
    }
  }
}
  
async function makeAuthenticatedRequest<T>(
  endpoint: string,
  method: string,
  body: unknown | undefined,
  token: string
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)

  if (response.status === 401) {
    return {
      ok: false,
      error: 'Unauthorized',
      needsReauth: true,
    }
  }

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage: string
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorJson.error || errorText
    } catch {
      errorMessage = errorText
    }
    return {
      ok: false,
      error: `${response.status}: ${errorMessage}`,
    }
  }

  const data = await response.json()
  return { ok: true, data }
}
