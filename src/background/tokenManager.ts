import type { TokenData } from '../shared/messages'
import { API_BASE } from '../shared/config'
const TOKEN_STORAGE_KEY = 'tokenData'
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // Refresh 5 minutes before expiry

let cachedTokenData: TokenData | null = null
let cacheInitialized = false
let refreshPromise: Promise<TokenData | null> | null = null

// Listen for storage changes to invalidate cache
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[TOKEN_STORAGE_KEY]) {
      cachedTokenData = (changes[TOKEN_STORAGE_KEY].newValue as TokenData) || null
      console.log('[tokenManager] Token cache updated from storage change')
    }
  })
}

export async function getTokenData(): Promise<TokenData | null> {
  // Return cache if already initialized
  if (cacheInitialized) {
    return cachedTokenData
  }

  // Guard against non-extension context
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return null
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(TOKEN_STORAGE_KEY, (result) => {
      cachedTokenData = (result[TOKEN_STORAGE_KEY] as TokenData) || null
      cacheInitialized = true
      resolve(cachedTokenData)
    })
  })
}

export async function saveTokenData(data: TokenData): Promise<void> {
  cachedTokenData = data
  
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return
  }
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: data }, resolve)
  })
}

export async function clearTokenData(): Promise<void> {
  cachedTokenData = null
  cacheInitialized = true // Mark as initialized with null value
  
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return
  }
  
  return new Promise((resolve) => {
    chrome.storage.local.remove(TOKEN_STORAGE_KEY, resolve)
  })
}

export function tokenNeedsRefresh(tokenData: TokenData): boolean {
  return Date.now() >= tokenData.expiresAt - REFRESH_BUFFER_MS
}

export function tokenIsExpired(tokenData: TokenData): boolean {
  return Date.now() >= tokenData.expiresAt
}

export async function refreshAccessToken(tokenData: TokenData): Promise<TokenData | null> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: tokenData.refreshToken,
        }),
      })

      if (!response.ok) {
        console.error('[tokenManager] Refresh failed:', response.status)
        if (response.status === 401 || response.status === 403) {
          await clearTokenData()
        }
        return null
      }

      const data = await response.json()
      
      const newTokenData: TokenData = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || tokenData.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
      }

      await saveTokenData(newTokenData)
      
      return newTokenData
    } catch (error) {
      console.error('[tokenManager] Refresh error:', error)
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function getValidAccessToken(): Promise<string | null> {
  let tokenData = await getTokenData()
  
  if (!tokenData) {
    return null
  }

  if (tokenNeedsRefresh(tokenData)) {
    const refreshed = await refreshAccessToken(tokenData)
    if (!refreshed) {
      return null
    }
    tokenData = refreshed
  }

  return tokenData.accessToken
}

export async function isAuthenticated(): Promise<boolean> {
  const tokenData = await getTokenData()
  return Boolean(tokenData && !tokenIsExpired(tokenData))
}

export async function storeTokensFromAuth(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const tokenData: TokenData = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + (expiresIn * 1000),
  }
  await saveTokenData(tokenData)
}
