import { mount, unmount } from 'svelte'
import Main from './Main.svelte'
import { DEFAULT_N8N_URL } from './store.svelte'

const CONTAINER_ID = 'git8git-root'

let app: ReturnType<typeof mount> | null = null
let lastUrl = ''
let isValidN8nInstance = false

async function getStoredN8nBaseUrl(): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return DEFAULT_N8N_URL
  }
  return new Promise((resolve) => {
    chrome.storage.local.get('n8nBaseUrl', (result) => {
      resolve((result.n8nBaseUrl as string) || DEFAULT_N8N_URL)
    })
  })
}

async function checkIfValidN8nInstance(): Promise<boolean> {
  const storedBaseUrl = await getStoredN8nBaseUrl()
  const storedOrigin = new URL(storedBaseUrl).origin
  return window.location.origin === storedOrigin
}

function isWorkflowPage(): boolean {
  return /^\/workflow\/[^/]+/.test(window.location.pathname)
}

function findActionsContainer(): HTMLElement | null {
  const publishButton = document.querySelector('[data-test-id="workflow-open-publish-modal-button"]')
  if (publishButton) {
    const container = publishButton.closest('div[class*="_container_"]')
    if (container) return container as HTMLElement
  }

  const actionsSpan = document.querySelector('span.actions')
  if (actionsSpan) {
    const innerContainer = actionsSpan.querySelector('div[class*="_container_"]')
    if (innerContainer) return innerContainer as HTMLElement
  }

  return null
}

function mountApp() {
  if (document.getElementById(CONTAINER_ID)) return true

  const actionsContainer = findActionsContainer()
  if (!actionsContainer) {
    return false
  }

  const target = document.createElement('div')
  target.id = CONTAINER_ID
  actionsContainer.insertAdjacentElement('beforeend', target)

  app = mount(Main, { target })
  return true
}

function unmountApp() {
  const container = document.getElementById(CONTAINER_ID)
  if (container && app) {
    unmount(app)
    app = null
    container.remove()
  }
}

function waitForContainer() {
  if (!isWorkflowPage()) return

  const observer = new MutationObserver((_mutations, obs) => {
    if (mountApp()) obs.disconnect()
  })

  observer.observe(document.body, { childList: true, subtree: true })
  setTimeout(() => observer.disconnect(), 30000)
}

function initialize() {
  if (!isValidN8nInstance || !isWorkflowPage()) {
    return
  }

  if (!mountApp()) waitForContainer()
}

const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href
    unmountApp()
    setTimeout(initialize, 100)
  }
})

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'auth/complete') {
    unmountApp()
    setTimeout(initialize, 100)
  }
})

// Main entry point - check if this is a valid n8n instance before doing anything
async function main() {
  isValidN8nInstance = await checkIfValidN8nInstance()
  
  if (!isValidN8nInstance) {
    return // Exit early - not the configured n8n instance
  }

  lastUrl = window.location.href
  urlObserver.observe(document.body, { childList: true, subtree: true })

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize)
  } else {
    initialize()
  }
}

main()
