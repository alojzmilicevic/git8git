/**
 * MV3 background script (service worker).
 *
 * This is where you'll eventually put:
 * - GitHub API calls / OAuth
 * - n8n webhook uploads
 * - message handling from the popup
 *
 * Note: MV3 service workers can be suspended at any time, so persist important
 * state in chrome.storage, not in-memory globals.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed')
})

