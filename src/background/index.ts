import type { BackgroundRequest, BackgroundResponse } from '../shared/messages'
import { handleApiRequest } from './apiHandler'
import { isAuthenticated, clearTokenData, getValidAccessToken, storeTokensFromAuth } from './tokenManager'

const POPUP_PATH = 'src/popup/popup.html'

function isN8nWorkflowsUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) return false

  try {
    const url = new URL(rawUrl)

    if (url.protocol !== 'http:') return false
    if (url.hostname !== 'localhost') return false
    if (url.port !== '5678') return false

    if (url.pathname === '/home/workflows' || url.pathname.startsWith('/home/workflows/')) return true

    if (url.hash === '#/home/workflows' || url.hash.startsWith('#/home/workflows/')) return true

    return false
  } catch {
    return false
  }
}

async function applyActionStateForTab(tabId: number, tabUrl: string | undefined) {
  const enabled = isN8nWorkflowsUrl(tabUrl)

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

async function setupDeclarativeContentRules() {
  await chrome.declarativeContent.onPageChanged.removeRules(undefined)

  await chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: {
            schemes: ['http'],
            hostEquals: 'localhost',
            ports: [5678],
            pathEquals: '/home/workflows'
          }
        })
      ],
      actions: [new chrome.declarativeContent.ShowAction()]
    }
  ])
}

chrome.runtime.onInstalled.addListener(async () => {
  await setupDeclarativeContentRules()
  await syncActiveTabActionState()
})

chrome.runtime.onStartup?.addListener(async () => {
  await setupDeclarativeContentRules()
  await syncActiveTabActionState()
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

  if (url?.startsWith('http://localhost:3000/auth/github/callback')) {
    try {
      const parsedUrl = new URL(url)
      
      // Parse hash params: #accessToken=...&refreshToken=...&expiresIn=... 
      const hashParams = new URLSearchParams(parsedUrl.hash.substring(1))
      const accessToken = hashParams.get('accessToken')
      const refreshToken = hashParams.get('refreshToken')
      const expiresIn = hashParams.get('expiresIn')

      if (accessToken && refreshToken && expiresIn) {
        await storeTokensFromAuth(accessToken, refreshToken, parseInt(expiresIn, 10))

        try {
          await chrome.tabs.remove(tabId)
        } catch {
        }

        const n8nTabs = await chrome.tabs.query({ url: 'http://localhost:5678/*' })
        for (const n8nTab of n8nTabs) {
          if (n8nTab.id) {
            chrome.tabs.sendMessage(n8nTab.id, { type: 'auth/complete' }).catch(() => {})
          }
        }
      }
    } catch (e) {
      console.error('[git8git] Error processing OAuth callback:', e)
    }
  }

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
