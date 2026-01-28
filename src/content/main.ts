import { mount, unmount } from 'svelte'
import Main from './Main.svelte'

const CONTAINER_ID = 'git8git-root'

let app: ReturnType<typeof mount> | null = null
let lastUrl = ''

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
  if (!isWorkflowPage()) {
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

lastUrl = window.location.href
urlObserver.observe(document.body, { childList: true, subtree: true })

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'auth/complete') {
    unmountApp()
    setTimeout(initialize, 100)
  }
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}
