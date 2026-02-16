/**
 * Request host permission for a given URL at runtime.
 * Returns true if permission was granted (or already exists).
 */
export async function requestHostPermission(url: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions) {
    console.warn('[git8git] Chrome permissions API not available')
    return false
  }

  try {
    const origin = new URL(url).origin + '/*'
    
    // Check if we already have the permission
    const hasPermission = await chrome.permissions.contains({ origins: [origin] })
    if (hasPermission) {
      return true
    }

    // Request the permission
    const granted = await chrome.permissions.request({ origins: [origin] })
    return granted
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
