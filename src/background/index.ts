import type { BackgroundRequest, BackgroundResponse } from '../shared/messages'
import { handleApiRequest } from './apiHandler'
import { isAuthenticated, clearTokenData, getValidAccessToken, storeTokensFromAuth } from './tokenManager'
import { API_BASE, GITHUB_CLIENT_ID } from '../shared/config'
import { DEFAULT_N8N_URL } from '../content/store.svelte'

const POPUP_PATH = 'src/popup/popup.html'

async function getStoredN8nBaseUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get('n8nBaseUrl', (result) => {
      resolve((result.n8nBaseUrl as string) || DEFAULT_N8N_URL)
    })
  })
}

function isN8nWorkflowPath(url: URL): boolean {
  // Check pathname patterns
  if (url.pathname === '/home/workflows' || url.pathname.startsWith('/home/workflows/')) return true
  if (url.pathname.startsWith('/workflow/')) return true
  
  // Check hash patterns (for older n8n versions)
  if (url.hash === '#/home/workflows' || url.hash.startsWith('#/home/workflows/')) return true
  if (url.hash.startsWith('#/workflow/')) return true
  
  return false
}

async function isN8nWorkflowsUrl(rawUrl: string | undefined): Promise<boolean> {
  if (!rawUrl) return false

  try {
    const url = new URL(rawUrl)
    const storedBaseUrl = await getStoredN8nBaseUrl()
    const storedUrl = new URL(storedBaseUrl)

    // Check if origin matches stored n8n URL
    if (url.origin === storedUrl.origin) {
      return isN8nWorkflowPath(url)
    }

    return false
  } catch {
    return false
  }
}

async function applyActionStateForTab(tabId: number, tabUrl: string | undefined) {
  const enabled = await isN8nWorkflowsUrl(tabUrl)

  if (enabled) {
    await chrome.action.enable(tabId)
    await chrome.action.setPopup({ tabId, popup: POPUP_PATH })
  } else {
    await chrome.action.disable(tabId)
    await chrome.action.setPopup({ tabId, popup: '' })
  }
}

async function syncActiveTabActionState() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return
  await applyActionStateForTab(tab.id, tab.url)
}

chrome.runtime.onInstalled.addListener(async () => {
  await syncActiveTabActionState()
})

chrome.runtime.onStartup?.addListener(async () => {
  await syncActiveTabActionState()
})

// Re-check tabs when n8n URL config changes
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.n8nBaseUrl) {
    await syncActiveTabActionState()
  }
})

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId)
    await applyActionStateForTab(tabId, tab.url)
  } catch {
    // ignore
  }
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url && !tab.url) return

  const url = changeInfo.url ?? tab.url

  try {
    await applyActionStateForTab(tabId, url)
  } catch {
  }
})

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
            const redirectUri = chrome.identity.getRedirectURL()
            const state = crypto.randomUUID()
            const authUrl =
              `https://github.com/login/oauth/authorize` +
              `?client_id=${GITHUB_CLIENT_ID}` +
              `&redirect_uri=${encodeURIComponent(redirectUri)}` +
              `&scope=repo,read:user,user:email` +
              `&state=${state}`
            const callbackUrl = await chrome.identity.launchWebAuthFlow({
              url: authUrl,
              interactive: true,
            })
            if (!callbackUrl) throw new Error('OAuth flow cancelled or failed')
            const code = new URL(callbackUrl).searchParams.get('code')
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
