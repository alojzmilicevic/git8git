<script lang="ts">
  import n8nLogo from '../../assets/n8n.svg'

  interface Props {
    connected?: boolean
    onSave?: (apiKey: string) => void
    onDisconnect?: () => void
  }

  let { connected = false, onSave, onDisconnect }: Props = $props()

  let apiKey = $state('')
  let showInput = $state(false)
  let error = $state('')
  let loading = $state(false)

  const N8N_BASE_URL = 'http://localhost:5678'

  function handleConnect() {
    showInput = true
  }

  async function validateApiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows?limit=1`, {
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
    if (!trimmedKey) {
      error = 'Please enter an API key'
      return
    }

    error = ''
    loading = true

    const isValid = await validateApiKey(trimmedKey)
    
    loading = false

    if (!isValid) {
      error = 'Invalid API key. Check your key and try again.'
      return
    }

    onSave?.(trimmedKey)
    apiKey = ''
    showInput = false
  }

  function handleCancel() {
    apiKey = ''
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
  {:else if showInput}
    <div style="display: flex !important; flex-direction: column !important; gap: 8px !important;">
      <div style="font-size: 12px !important; color: #525252 !important;">
        Enter your n8n API key
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
