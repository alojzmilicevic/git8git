<script lang="ts">
  import n8nLogo from '../../assets/n8n.svg'
  import { requestHostPermission } from '../../shared/permissions'
  import { DEFAULT_N8N_URL } from '../store.svelte';

  interface Props {
    connected?: boolean
    currentUrl?: string
    onSave?: (apiKey: string, baseUrl: string) => void
    onDisconnect?: () => void
  }

  let { connected = false, currentUrl = DEFAULT_N8N_URL, onSave, onDisconnect }: Props = $props()

  let baseUrl = $state(DEFAULT_N8N_URL)
  let apiKey = $state('')
  let showInput = $state(false)
  let error = $state('')
  let loading = $state(false)

  function handleConnect() {
    baseUrl = currentUrl || DEFAULT_N8N_URL
    showInput = true
  }

  async function validateApiKey(url: string, key: string): Promise<boolean> {
    try {
      const response = await fetch(`${url}/api/v1/workflows?limit=1`, {
        headers: {
          'X-N8N-API-KEY': key,
          'Accept': 'application/json'
        }
      })
      return response.ok
    } catch {
      return false
    }
  }

  async function handleSave() {
    const trimmedKey = apiKey.trim()
    const trimmedUrl = baseUrl.trim().replace(/\/$/, '') // Remove trailing slash
    
    if (!trimmedUrl) {
      error = 'Please enter your n8n URL'
      return
    }
    
    if (!trimmedKey) {
      error = 'Please enter an API key'
      return
    }

    error = ''
    loading = true

    // Request permission for the n8n URL if it's not localhost:5678
    const permissionGranted = await requestHostPermission(trimmedUrl)
    if (!permissionGranted) {
      error = 'Permission denied for this URL. Please allow access when prompted.'
      loading = false
      return
    }

    const isValid = await validateApiKey(trimmedUrl, trimmedKey)
    
    loading = false

    if (!isValid) {
      error = 'Invalid API key or URL. Check your settings and try again.'
      return
    }

    onSave?.(trimmedKey, trimmedUrl)
    apiKey = ''
    baseUrl = DEFAULT_N8N_URL
    showInput = false
  }

  function handleCancel() {
    apiKey = ''
    baseUrl = DEFAULT_N8N_URL
    error = ''
    showInput = false
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !loading) {
      handleSave()
    } else if (event.key === 'Escape') {
      handleCancel()
    }
  }
</script>

<div style="display: flex !important; flex-direction: column !important; gap: 12px !important;">
  <div style="font-size: 11px !important; font-weight: 600 !important; color: #737373 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important;">
    n8n
  </div>

  {#if connected}
    <div style="display: flex !important; flex-direction: column !important; gap: 6px !important;">
      <div style="display: flex !important; align-items: center !important; justify-content: space-between !important;">
        <div style="display: flex !important; align-items: center !important; gap: 8px !important; font-size: 14px !important; color: #10b981 !important;">
          <img src={n8nLogo} alt="" style="width: 16px !important; height: 16px !important;" />
          <span>Connected</span>
        </div>
        <button
          type="button"
          style="font-size: 12px !important; color: #737373 !important; background: none !important; border: none !important; cursor: pointer !important;"
          onclick={onDisconnect}
        >
          Disconnect
        </button>
      </div>
      <div style="font-size: 11px !important; color: #737373 !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important;">
        {currentUrl}
      </div>
    </div>
  {:else if showInput}
    <div style="display: flex !important; flex-direction: column !important; gap: 8px !important;">
      <div style="font-size: 12px !important; color: #525252 !important;">
        n8n Instance URL
      </div>
      <input
        type="text"
        bind:value={baseUrl}
        onkeydown={handleKeydown}
        placeholder={DEFAULT_N8N_URL}
        style="
          width: 100% !important;
          padding: 8px 10px !important;
          border-radius: 6px !important;
          border: 1px solid #d4d4d4 !important;
          font-size: 13px !important;
          background: white !important;
          color: #262626 !important;
          outline: none !important;
          box-sizing: border-box !important;
        "
      />
      
      <div style="font-size: 12px !important; color: #525252 !important; margin-top: 4px !important;">
        API Key
      </div>
      <div style="font-size: 11px !important; color: #737373 !important;">
        Settings → n8n API → Create API key
      </div>
      <input
        type="password"
        bind:value={apiKey}
        onkeydown={handleKeydown}
        placeholder="n8n-api-key-..."
        style="
          width: 100% !important;
          padding: 8px 10px !important;
          border-radius: 6px !important;
          border: 1px solid #d4d4d4 !important;
          font-size: 13px !important;
          background: white !important;
          color: #262626 !important;
          outline: none !important;
          box-sizing: border-box !important;
        "
      />
      {#if error}
        <div style="font-size: 12px !important; color: #ef4444 !important;">{error}</div>
      {/if}
      <div style="display: flex !important; gap: 8px !important; margin-top: 4px !important;">
        <button
          type="button"
          onclick={handleSave}
          disabled={loading}
          style="
            flex: 1 !important;
            padding: 8px 12px !important;
            border-radius: 6px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            cursor: {loading ? 'not-allowed' : 'pointer'} !important;
            border: none !important;
            background: {loading ? '#9ca3af' : '#10b981'} !important;
            color: white !important;
            opacity: {loading ? '0.7' : '1'} !important;
          "
        >
          {loading ? 'Validating...' : 'Save'}
        </button>
        <button
          type="button"
          onclick={handleCancel}
          disabled={loading}
          style="
            padding: 8px 12px !important;
            border-radius: 6px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            cursor: {loading ? 'not-allowed' : 'pointer'} !important;
            border: 1px solid #d4d4d4 !important;
            background: white !important;
            color: #525252 !important;
          "
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <button
      type="button"
      style="
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        width: 100% !important;
        padding: 10px 12px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        border: 1px solid #d4d4d4 !important;
        background: #f5f5f5 !important;
        color: #262626 !important;
        transition: all 0.15s ease !important;
      "
      onclick={handleConnect}
    >
      <img src={n8nLogo} alt="" style="width: 18px !important; height: 18px !important;" />
      <span>Connect to n8n</span>
    </button>
  {/if}
</div>
