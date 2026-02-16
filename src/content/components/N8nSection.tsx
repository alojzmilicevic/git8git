import { useState } from 'react'
import n8nLogo from '../../assets/n8n.svg'
import { requestHostPermission } from '../../shared/permissions'
import { DEFAULT_N8N_URL } from '../../shared/config'

interface Props {
  connected?: boolean
  currentUrl?: string
  onSave?: (apiKey: string, baseUrl: string) => void
  onDisconnect?: () => void
}

export function N8nSection({ connected = false, currentUrl = DEFAULT_N8N_URL, onSave, onDisconnect }: Props) {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_N8N_URL)
  const [apiKey, setApiKey] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleConnect() {
    setBaseUrl(currentUrl || DEFAULT_N8N_URL)
    setShowInput(true)
  }

  async function validateApiKey(url: string, key: string): Promise<boolean> {
    try {
      const response = await fetch(`${url}/api/v1/workflows?limit=1`, {
        headers: {
          'X-N8N-API-KEY': key,
          Accept: 'application/json',
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  async function handleSave() {
    const trimmedKey = apiKey.trim()
    const trimmedUrl = baseUrl.trim().replace(/\/$/, '')

    if (!trimmedUrl) {
      setError('Please enter your n8n URL')
      return
    }
    if (!trimmedKey) {
      setError('Please enter an API key')
      return
    }

    setError('')
    setLoading(true)

    const permissionGranted = await requestHostPermission(trimmedUrl)
    if (!permissionGranted) {
      setError('Permission denied for this URL. Please allow access when prompted.')
      setLoading(false)
      return
    }

    const isValid = await validateApiKey(trimmedUrl, trimmedKey)
    setLoading(false)

    if (!isValid) {
      setError('Invalid API key or URL. Check your settings and try again.')
      return
    }

    onSave?.(trimmedKey, trimmedUrl)
    setApiKey('')
    setBaseUrl(DEFAULT_N8N_URL)
    setShowInput(false)
  }

  function handleCancel() {
    setApiKey('')
    setBaseUrl(DEFAULT_N8N_URL)
    setError('')
    setShowInput(false)
  }

  function handleKeydown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' && !loading) {
      handleSave()
    } else if (event.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
        n8n
      </div>

      {connected ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-500">
              <img src={n8nLogo} alt="" className="w-4 h-4" />
              <span>Connected</span>
            </div>
            <button
              type="button"
              className="text-xs text-neutral-500 bg-transparent border-none cursor-pointer"
              onClick={onDisconnect}
            >
              Disconnect
            </button>
          </div>
          <div className="text-[11px] text-neutral-500 overflow-hidden text-ellipsis whitespace-nowrap">
            {currentUrl}
          </div>
        </div>
      ) : showInput ? (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-neutral-600">n8n Instance URL</div>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            onKeyDown={handleKeydown}
            placeholder={DEFAULT_N8N_URL}
            className="w-full px-2.5 py-2 rounded-md border border-neutral-300 text-[13px] bg-white text-neutral-800 outline-none box-border"
          />

          <div className="text-xs text-neutral-600 mt-1">API Key</div>
          <div className="text-[11px] text-neutral-500">Settings &rarr; n8n API &rarr; Create API key</div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={handleKeydown}
            placeholder="n8n-api-key-..."
            className="w-full px-2.5 py-2 rounded-md border border-neutral-300 text-[13px] bg-white text-neutral-800 outline-none box-border"
          />

          {error && <div className="text-xs text-red-500">{error}</div>}

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className={`flex-1 px-3 py-2 rounded-md text-[13px] font-medium border-none text-white ${
                loading ? 'cursor-not-allowed bg-neutral-400 opacity-70' : 'cursor-pointer bg-emerald-500'
              }`}
            >
              {loading ? 'Validating...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className={`px-3 py-2 rounded-md text-[13px] font-medium border border-neutral-300 bg-white text-neutral-600 ${
                loading ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer border border-neutral-300 bg-neutral-100 text-neutral-800 transition-all duration-150"
          onClick={handleConnect}
        >
          <img src={n8nLogo} alt="" className="w-[18px] h-[18px]" />
          <span>Connect to n8n</span>
        </button>
      )}
    </div>
  )
}
