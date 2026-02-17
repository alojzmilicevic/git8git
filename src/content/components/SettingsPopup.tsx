import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { GitHubSection } from './GitHubSection'
import { N8nSection } from './N8nSection'
import { useAppStore } from '../store'
import { getOverlayRoot } from '../shadowPorts'

interface Props {
  onClose?: () => void
}

export function SettingsPopup({ onClose }: Props) {
  const popupRef = useRef<HTMLDivElement>(null)
  const authInProgress = useRef(false)
  const githubConnected = useAppStore((s) => s.githubConnected)
  const n8nConnected = useAppStore((s) => s.n8nConnected)
  const n8nBaseUrl = useAppStore((s) => s.n8nBaseUrl)
  const disconnectGitHub = useAppStore((s) => s.disconnectGitHub)
  const saveN8nConfig = useAppStore((s) => s.saveN8nConfig)
  const disconnectN8n = useAppStore((s) => s.disconnectN8n)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (authInProgress.current) return
      const target = event.target as HTMLElement
      if (target.closest('[data-settings-button]')) return
      if (popupRef.current && !popupRef.current.contains(target)) {
        onClose?.()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [onClose])

  function handleGitHubConnect() {
    authInProgress.current = true
    chrome.runtime.sendMessage({ type: 'auth/connect' }, () => {
      authInProgress.current = false
    })
  }

  return createPortal(
    <div
      ref={popupRef}
      className="fixed top-[50px] right-5 w-[280px] p-4 rounded-xl border border-neutral-300 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.3)] z-[2147483647]"
    >
      <div className="flex flex-col gap-4">
        <GitHubSection
          connected={githubConnected}
          onConnect={handleGitHubConnect}
          onDisconnect={disconnectGitHub}
        />

        {/* Divider */}
        <div className="h-px bg-neutral-200" />

        <N8nSection
          connected={n8nConnected}
          currentUrl={n8nBaseUrl}
          onSave={saveN8nConfig}
          onDisconnect={disconnectN8n}
        />
      </div>
    </div>,
    getOverlayRoot(),
  )
}
