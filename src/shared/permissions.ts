/**
 * Request host permission for a given URL at runtime.
 * Routes through the background service worker because content scripts
 * cannot call chrome.permissions.request() directly.
 * Returns true if permission was granted (or already exists).
 */
export async function requestHostPermission(url: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.warn('[git8git] Chrome runtime API not available')
    return false
  }

  try {
    const origin = new URL(url).origin + '/*'

    const response = await chrome.runtime.sendMessage({
      type: 'permissions/request',
      origin,
    })

    return response?.ok && response.granted
  } catch (error) {
    console.error('[git8git] Failed to request permission:', error)
    return false
  }
}

/**
 * Check if we have permission for a given URL.
 */
export async function hasHostPermission(url: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions) {
    return false
  }

  try {
    const origin = new URL(url).origin + '/*'
    return await chrome.permissions.contains({ origins: [origin] })
  } catch {
    return false
  }
}
