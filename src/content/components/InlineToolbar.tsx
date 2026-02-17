import { useCallback, useState } from 'react'
import { useAppStore } from '../store'
import { WorkflowButtons } from '../WorkflowButtons'
import { SettingsButton } from './SettingsButton'
import { SettingsPopup } from './SettingsPopup'

export function InlineToolbar() {
  const [showSettings, setShowSettings] = useState(false)
  const githubConnected = useAppStore((s) => s.githubConnected)
  const n8nConnected = useAppStore((s) => s.n8nConnected)
  const selectedRepo = useAppStore((s) => s.selectedRepo)
  const selectedBranch = useAppStore((s) => s.selectedBranch)
  const closeSettings = useCallback(() => setShowSettings(false), [])

  return (
    <div className="flex items-center gap-2 ml-2 relative z-2147483647">
      <div className="w-px h-5 shrink-0 bg-neutral-500" />

      {githubConnected && n8nConnected && (
        <WorkflowButtons repo={selectedRepo} branch={selectedBranch} />
      )}

      <SettingsButton onClick={() => setShowSettings((v) => !v)} />

      {showSettings && <SettingsPopup onClose={closeSettings} />}
    </div>
  )
}
