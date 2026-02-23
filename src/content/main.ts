import { createRoot, type Root } from 'react-dom/client'
import { createElement } from 'react'
import { App } from './App'
import { DEFAULT_N8N_URL } from '../shared/config'
import { initOverlayRoot, destroyOverlay } from './shadowPorts'
import cssText from './styles.css?inline'

const CONTAINER_ID = 'git8git-root'

let root: Root | null = null
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

const CONTAINER_SELECTOR = 'div[class*="_container_"]'

function findActionsContainer(): HTMLElement | null {
  const publishButton = document.querySelector('[data-test-id="workflow-open-publish-modal-button"]')
  if (publishButton) {
    const container = publishButton.closest(CONTAINER_SELECTOR)
    if (container) return container as HTMLElement
  }

  const actionsSpan = document.querySelector('span.actions')
  if (actionsSpan) {
    const container = actionsSpan.querySelector(CONTAINER_SELECTOR)
    if (container) return container as HTMLElement
  }

  return null
}

function createHost(id: string): HTMLDivElement {
  const host = document.createElement('div')
  host.id = id
  return host
}

function attachShadowWithStyles(host: HTMLDivElement): HTMLDivElement {
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = cssText
  shadow.appendChild(style)

  const renderTarget = document.createElement('div')
  shadow.appendChild(renderTarget)

  const overlayTarget = document.createElement('div')
  shadow.appendChild(overlayTarget)
  initOverlayRoot(overlayTarget)

  return renderTarget
}

function mount(container: HTMLElement, fab: boolean) {
  const host = createHost(CONTAINER_ID)

  if (fab) {
    Object.assign(host.style, { position: 'fixed', bottom: '24px', right: '24px', zIndex: '2147483647' })
  }

  container.appendChild(host)
  const renderTarget = attachShadowWithStyles(host)
  root = createRoot(renderTarget)
  root.render(createElement(App, { fab }))
}

function tryMountInline(): boolean {
  if (document.getElementById(CONTAINER_ID)) return true

  const actionsContainer = findActionsContainer()
  if (!actionsContainer) return false

  mount(actionsContainer, false)
  return true
}

function mountFab() {
  if (document.getElementById(CONTAINER_ID)) return
  mount(document.body, true)
}

function unmountApp() {
  const container = document.getElementById(CONTAINER_ID)
  if (container && root) {
    root.unmount()
    root = null
    container.remove()
  }
  destroyOverlay()
}

function waitForContainer() {
  if (!isWorkflowPage()) return

  const observer = new MutationObserver((_mutations, obs) => {
    if (tryMountInline()) obs.disconnect()
  })

  observer.observe(document.body, { childList: true, subtree: true })

  // If inline container never appears, fall back to FAB
  setTimeout(() => {
    observer.disconnect()
    console.log('Fallback to FAB')
    mountFab()
  }, 2000)
}

function initialize() {
  if (!isValidN8nInstance || !isWorkflowPage()) {
    return
  }

  if (!tryMountInline()) waitForContainer()
}

const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href
    unmountApp()
    setTimeout(initialize, 100)
  }
})

// Main entry point
async function main() {
  isValidN8nInstance = await checkIfValidN8nInstance()

  if (!isValidN8nInstance) {
    return
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
