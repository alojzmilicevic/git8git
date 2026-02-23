import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GitHubSection } from './GitHubSection'
import { N8nSection } from './N8nSection'
import { useAppStore } from '../store'
import { getOverlayRoot } from '../shadowPorts'
import { useClickOutside } from '../useClickOutside'

interface Props {
  onClose?: () => void
  anchor?: 'top' | 'bottom'
  children?: ReactNode
  portal?: boolean
}

export function SettingsPopup({ onClose, anchor, children, portal = true }: Props) {
  const popupRef = useRef<HTMLDivElement>(null)
  const authInProgress = useRef(false)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const githubConnected = useAppStore((s) => s.githubConnected)
  const n8nConnected = useAppStore((s) => s.n8nConnected)
  const n8nBaseUrl = useAppStore((s) => s.n8nBaseUrl)
  const disconnectGitHub = useAppStore((s) => s.disconnectGitHub)
  const saveN8nConfig = useAppStore((s) => s.saveN8nConfig)
  const disconnectN8n = useAppStore((s) => s.disconnectN8n)

  const handleClickOutside = useCallback(() => {
    if (!authInProgress.current) onClose?.()
  }, [onClose])

  useClickOutside(popupRef, handleClickOutside)

  function handleGitHubConnect() {
    setConnecting(true)
    setConnectError(null)
    authInProgress.current = true
    chrome.runtime.sendMessage({ type: 'auth/connect' }, (response) => {
      authInProgress.current = false
      setConnecting(false)
      const err = chrome.runtime.lastError?.message
      if (err) {
        setConnectError(err)
      } else if (response && !response.ok) {
        setConnectError(response.error ?? 'Authentication failed')
      }
    })
  }

  const content = (
    <div
      ref={popupRef}
      className={`fixed ${anchor === 'bottom' ? 'bottom-[80px]' : 'top-[50px]'} right-5 w-[280px] p-4 rounded-xl border border-neutral-300 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.3)] z-[2147483647]`}
    >
      <div className="flex flex-col gap-4">
        {children && (
          <>
            {children}
            <div className="h-px bg-neutral-200" />
          </>
        )}

        <GitHubSection
          connected={githubConnected}
          connecting={connecting}
          connectError={connectError}
          onConnect={handleGitHubConnect}
          onDisconnect={disconnectGitHub}
        />

        <div className="h-px bg-neutral-200" />

        <N8nSection
          connected={n8nConnected}
          currentUrl={n8nBaseUrl}
          onSave={saveN8nConfig}
          onDisconnect={disconnectN8n}
        />
      </div>
    </div>
  )

  return portal ? createPortal(content, getOverlayRoot()) : content
}
