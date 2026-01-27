const TOKEN_KEY = 'github_access_token'
const DEVICE_FLOW_KEY = 'github_device_flow_session'

type DeviceFlowSession = {
  verification_uri: string
  user_code: string
  device_code: string
  interval: number
  expires_in: number
  created_at: number
}

export async function getStoredToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY)
  return (result[TOKEN_KEY] as string | undefined) ?? null
}

export async function clearStoredToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_KEY)
}

export async function getDeviceFlowSession(): Promise<DeviceFlowSession | null> {
  const result = await chrome.storage.local.get(DEVICE_FLOW_KEY)
  return (result[DEVICE_FLOW_KEY] as DeviceFlowSession | undefined) ?? null
}

export async function clearDeviceFlowSession(): Promise<void> {
  await chrome.storage.local.remove(DEVICE_FLOW_KEY)
}

/**
 * GitHub OAuth App "web flow" requires a client_secret for token exchange.
 * Since a browser extension cannot safely store a secret, we use Device Flow.
 *
 * Docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */
export async function startDeviceFlow(): Promise<{
  verification_uri: string
  user_code: string
  device_code: string
  interval: number
  expires_in: number
}> {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined
  if (!clientId || clientId === 'YOUR_GITHUB_OAUTH_CLIENT_ID_HERE') {
    throw new Error('Missing VITE_GITHUB_CLIENT_ID. Create .env from .env.example.')
  }

  // "repo" covers private repos. If you only want public repos later, use "public_repo".
  const scope = 'repo'

  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      scope
    }).toString()
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Device flow start failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as {
    device_code: string
    user_code: string
    verification_uri: string
    expires_in: number
    interval: number
  }

  await chrome.storage.local.set({
    [DEVICE_FLOW_KEY]: {
      ...json,
      created_at: Date.now()
    } satisfies DeviceFlowSession
  })

  return json
}

export async function pollDeviceFlowOnce(deviceCode: string): Promise<{
  authenticated: boolean
  pending: boolean
  reason?: 'authorization_pending' | 'slow_down'
  next_interval?: number
}> {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined
  if (!clientId || clientId === 'YOUR_GITHUB_OAUTH_CLIENT_ID_HERE') {
    throw new Error('Missing VITE_GITHUB_CLIENT_ID. Create .env from .env.example.')
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
    }).toString()
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Device flow poll failed (${res.status}): ${text}`)
  }

  const tokenObj = (await res.json()) as {
    access_token?: string
    scope?: string
    token_type?: string
    error?:
      | 'authorization_pending'
      | 'slow_down'
      | 'expired_token'
      | 'access_denied'
      | 'incorrect_device_code'
      | 'incorrect_client_credentials'
    error_description?: string
    interval?: number
  }

  if (tokenObj.access_token) {
    await chrome.storage.local.set({ [TOKEN_KEY]: tokenObj.access_token })
    await clearDeviceFlowSession()
    return { authenticated: true, pending: false }
  }

  if (tokenObj.error === 'authorization_pending') {
    return { authenticated: false, pending: true, reason: 'authorization_pending' }
  }
  if (tokenObj.error === 'slow_down') {
    // GitHub may include a new recommended interval when slowing down.
    return {
      authenticated: false,
      pending: true,
      reason: 'slow_down',
      next_interval: typeof tokenObj.interval === 'number' ? tokenObj.interval : undefined
    }
  }

  if (tokenObj.error) {
    // Terminal errors: clear stored session so user can restart cleanly.
    if (
      tokenObj.error === 'expired_token' ||
      tokenObj.error === 'access_denied' ||
      tokenObj.error === 'incorrect_device_code' ||
      tokenObj.error === 'incorrect_client_credentials'
    ) {
      await clearDeviceFlowSession()
    }

    throw new Error(
      `Device flow error: ${tokenObj.error}${tokenObj.error_description ? ` (${tokenObj.error_description})` : ''}`
    )
  }

  // Shouldn't happen, but keep it readable.
  return { authenticated: false, pending: true }
}

