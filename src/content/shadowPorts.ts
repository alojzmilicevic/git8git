import cssText from './styles.css?inline'

let overlayHost: HTMLDivElement | null = null
let overlayShadow: ShadowRoot | null = null
let overlayContainer: HTMLDivElement | null = null

/**
 * Returns (creating if needed) a shadow-isolated container on document.body
 * for fixed-position elements like modals and popups.
 */
export function getOverlayRoot(): HTMLDivElement {
  if (overlayContainer) return overlayContainer

  overlayHost = document.createElement('div')
  overlayHost.id = 'git8git-overlay'
  document.body.appendChild(overlayHost)

  overlayShadow = overlayHost.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = cssText
  overlayShadow.appendChild(style)

  overlayContainer = document.createElement('div')
  overlayShadow.appendChild(overlayContainer)

  return overlayContainer
}

/**
 * Tear down the overlay shadow root. Called on unmount.
 */
export function destroyOverlay(): void {
  overlayHost?.remove()
  overlayHost = null
  overlayShadow = null
  overlayContainer = null
}
