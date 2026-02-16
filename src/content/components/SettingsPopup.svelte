<script lang="ts">
  import { onMount } from 'svelte'
  import GitHubSection from './GitHubSection.svelte'
  import N8nSection from './N8nSection.svelte'
  import { appState, disconnectGitHub, saveN8nConfig, disconnectN8n } from '../store.svelte'

  interface Props {
    onClose?: () => void
  }

  let { onClose }: Props = $props()

  let popupRef: HTMLElement

  function handleGitHubConnect() {
    chrome.runtime.sendMessage({ type: 'auth/connect' })
  }

  function handleGitHubDisconnect() {
    disconnectGitHub()
  }

  function handleN8nSave(apiKey: string, baseUrl: string) {
    saveN8nConfig(apiKey, baseUrl)
  }

  function handleN8nDisconnect() {
    disconnectN8n()
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement
    
    if (target.closest('[data-settings-button]')) {
      return
    }
    
    if (popupRef && !popupRef.contains(target)) {
      onClose?.()
    }
  }

  onMount(() => {
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
    }, 0)
    
    return () => {
      document.removeEventListener('click', handleClickOutside, true)
    }
  })
</script>

<div
  bind:this={popupRef}
  style="
    position: fixed !important;
    top: 50px !important;
    right: 20px !important;
    width: 280px !important;
    padding: 16px !important;
    border-radius: 12px !important;
    border: 1px solid #d4d4d4 !important;
    background: white !important;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
    z-index: 2147483647 !important;
  "
>
  <div style="display: flex !important; flex-direction: column !important; gap: 16px !important;">
    <GitHubSection
      connected={appState.githubConnected}
      onConnect={handleGitHubConnect}
      onDisconnect={handleGitHubDisconnect}
    />

    <!-- Divider -->
    <div style="height: 1px !important; background: #e5e5e5 !important;"></div>

    <N8nSection
      connected={appState.n8nConnected}
      currentUrl={appState.n8nBaseUrl}
      onSave={handleN8nSave}
      onDisconnect={handleN8nDisconnect}
    />
  </div>
</div>
