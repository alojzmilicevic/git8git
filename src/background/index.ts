import type { BackgroundRequest, BackgroundResponse } from '../shared/messages'
import {
  clearDeviceFlowSession,
  clearStoredToken,
  getDeviceFlowSession,
  getStoredToken,
  pollDeviceFlowOnce,
  startDeviceFlow
} from './githubAuth'
import { listRepos } from './githubApi'

const POPUP_PATH = 'src/popup/popup.html'

function makeDotIcon(size: number, enabled: boolean): ImageData {
  // Create a simple “dot” icon so we don’t need to ship extra image files.
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')
  if (!ctx) return new ImageData(size, size)

  ctx.clearRect(0, 0, size, size)

  // Background (subtle rounded square)
  const r = Math.max(3, Math.floor(size * 0.22))
  const pad = Math.max(1, Math.floor(size * 0.08))
  ctx.fillStyle = enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.12)'
  ctx.strokeStyle = enabled ? 'rgba(16, 185, 129, 0.65)' : 'rgba(148, 163, 184, 0.55)'
  ctx.lineWidth = Math.max(1, Math.floor(size * 0.07))

  ctx.beginPath()
  ctx.roundRect(pad, pad, size - pad * 2, size - pad * 2, r)
  ctx.fill()
  ctx.stroke()

  // Dot
  const dotR = Math.max(3, Math.floor(size * 0.18))
  ctx.beginPath()
  ctx.fillStyle = enabled ? 'rgba(16, 185, 129, 0.95)' : 'rgba(148, 163, 184, 0.9)'
  ctx.arc(size / 2, size / 2, dotR, 0, Math.PI * 2)
  ctx.fill()

  return ctx.getImageData(0, 0, size, size)
}

async function setActionVisual(tabId: number, enabled: boolean) {
  // Icon
  await chrome.action.setIcon({
    tabId,
    imageData: {
      16: makeDotIcon(16, enabled),
      32: makeDotIcon(32, enabled)
    }
  })

  // Optional: subtle badge to reinforce state
  await chrome.action.setBadgeText({ tabId, text: enabled ? 'ON' : '' })
  await chrome.action.setBadgeBackgroundColor({ tabId, color: enabled ? '#10b981' : '#64748b' })
}

function isN8nWorkflowsUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) return false

  try {
    const url = new URL(rawUrl)

    if (url.protocol !== 'http:') return false
    if (url.hostname !== 'localhost') return false
    if (url.port !== '5678') return false

    // Allow:
    // - /home/workflows
    // - /home/workflows/
    // - /home/workflows?...
    if (url.pathname === '/home/workflows' || url.pathname.startsWith('/home/workflows/')) return true

    // In case n8n uses hash routing in your setup (e.g. http://localhost:5678/#/home/workflows)
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

  await setActionVisual(tabId, enabled)
}

async function syncActiveTabActionState() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return
  await applyActionStateForTab(tab.id, tab.url)
}

async function setupDeclarativeContentRules() {
  // This doesn't truly "hide" pinned icons, but it helps keep the action consistent.
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
  // Run when URL becomes known/changes
  if (!changeInfo.url && !tab.url) return
  try {
    await applyActionStateForTab(tabId, changeInfo.url ?? tab.url)
  } catch {
    // ignore
  }
})

chrome.runtime.onMessage.addListener(
  (message: BackgroundRequest, _sender, sendResponse: (response: BackgroundResponse) => void) => {
    ;(async () => {
      try {
        switch (message.type) {
          case 'auth/status': {
            const token = await getStoredToken()
            sendResponse({ ok: true, type: 'auth/status', authenticated: Boolean(token) })
            return
          }
          case 'auth/device/start': {
            const data = await startDeviceFlow()
            console.log('[auth] device/start', { verification_uri: data.verification_uri })
            sendResponse({ ok: true, type: 'auth/device/start', ...data })
            return
          }
          case 'auth/device/get': {
            const session = await getDeviceFlowSession()
            sendResponse({ ok: true, type: 'auth/device/get', session })
            return
          }
          case 'auth/device/clear': {
            await clearDeviceFlowSession()
            sendResponse({ ok: true, type: 'auth/device/clear' })
            return
          }
          case 'auth/device/poll': {
            const result = await pollDeviceFlowOnce(message.device_code)
            console.log('[auth] device/poll', result)
            sendResponse({ ok: true, type: 'auth/device/poll', ...result })
            return
          }
          case 'auth/logout': {
            await clearStoredToken()
            await clearDeviceFlowSession()
            sendResponse({ ok: true, type: 'auth/logout', authenticated: false })
            return
          }
          case 'repos/list': {
            const repos = await listRepos()
            sendResponse({ ok: true, type: 'repos/list', repos })
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

    // Keep the message channel open for async response.
    return true
  }
)

