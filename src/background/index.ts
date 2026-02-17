import type { BackgroundRequest, BackgroundResponse } from '../shared/messages'
import { handleApiRequest } from './apiHandler'
import { isAuthenticated, clearTokenData, getValidAccessToken, storeTokensFromAuth } from './tokenManager'
import { API_BASE, GITHUB_CLIENT_ID, DEFAULT_N8N_URL } from '../shared/config'

async function getStoredN8nBaseUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get('n8nBaseUrl', (result) => {
      resolve((result.n8nBaseUrl as string) || DEFAULT_N8N_URL)
    })
  })
}

chrome.runtime.onMessage.addListener(
  (message: BackgroundRequest, _sender, sendResponse: (response: BackgroundResponse) => void) => {
    ;(async () => {
      try {
        switch (message.type) {
          case 'api/request': {
            const response = await handleApiRequest(message)
            sendResponse(response as BackgroundResponse)
            return
          }

          case 'auth/status': {
            const authenticated = await isAuthenticated()
            sendResponse({ ok: true, type: 'auth/status', authenticated })
            return
          }

          case 'auth/getToken': {
            const token = await getValidAccessToken()
            sendResponse({ ok: true, type: 'auth/getToken', token })
            return
          }

          case 'auth/logout': {
            await clearTokenData()
            sendResponse({ ok: true, type: 'auth/logout', authenticated: false })
            return
          }

          case 'auth/connect': {
            if (!GITHUB_CLIENT_ID || String(GITHUB_CLIENT_ID).trim() === '') {
              throw new Error('Missing GitHub OAuth client id. Set VITE_GITHUB_CLIENT_ID in .env and rebuild the extension.')
            }

            // Use a stable redirect path so you can register it in GitHub OAuth app settings
            const redirectUri = chrome.identity.getRedirectURL('github')
            const state = crypto.randomUUID()
            const authUrl =
              `https://github.com/login/oauth/authorize` +
              `?client_id=${GITHUB_CLIENT_ID}` +
              `&redirect_uri=${encodeURIComponent(redirectUri)}` +
              `&scope=repo,read:user,user:email` +
              `&state=${state}`
            let callbackUrl: string | undefined
            try {
              callbackUrl = await chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true,
              })
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e)
              throw new Error(
                `Authorization page could not be loaded. ` +
                  `Check that GitHub is reachable and that your OAuth app callback URL matches this redirect URI: ${redirectUri}. ` +
                  `Original error: ${msg}`
              )
            }
            if (!callbackUrl) throw new Error('OAuth flow cancelled or failed')
            const callback = new URL(callbackUrl)
            const code = callback.searchParams.get('code')
            const oauthError = callback.searchParams.get('error') || callback.searchParams.get('error_description')
            if (oauthError) throw new Error(`OAuth error: ${oauthError}`)
            if (!code) throw new Error('No code in callback URL')
            const tokenRes = await fetch(`${API_BASE}/api/github/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            })
            if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`)
            const { accessToken, refreshToken, expiresIn } = await tokenRes.json()
            await storeTokensFromAuth(accessToken, refreshToken, expiresIn)
            const n8nBaseUrl = await getStoredN8nBaseUrl()
            const n8nTabs = await chrome.tabs.query({ url: `${n8nBaseUrl}/*` })
            for (const n8nTab of n8nTabs) {
              if (n8nTab.id) {
                chrome.tabs.sendMessage(n8nTab.id, { type: 'auth/complete' }).catch(() => {})
              }
            }
            sendResponse({ ok: true, type: 'auth/connect', authenticated: true })
            return
          }

          default:
            sendResponse({ ok: false, error: 'Unknown message type.' })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        sendResponse({ ok: false, error: message })
      }
    })()

    return true
  }
)
