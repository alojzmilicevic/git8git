let overlayContainer: HTMLDivElement | null = null

/**
 * Called once during mount to register the overlay div that lives inside
 * the main shadow root. Portals (modals, popups) render into this div,
 * keeping everything in a single shadow root so events, composedPath(),
 * contains(), etc. all work without special cross-shadow handling.
 */
export function initOverlayRoot(el: HTMLDivElement): void {
  overlayContainer = el
}

/**
 * Returns the overlay container for use with createPortal.
 */
export function getOverlayRoot(): HTMLDivElement {
  if (!overlayContainer) throw new Error('Overlay root not initialized')
  return overlayContainer
}

/**
 * Clear the overlay root reference on unmount.
 */
export function destroyOverlay(): void {
  overlayContainer = null
}
