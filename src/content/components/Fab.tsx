import { useCallback, useState } from 'react'
import { useAppStore } from '../store'
import { WorkflowButtons } from '../WorkflowButtons'
import { SettingsPopup } from './SettingsPopup'

export function Fab() {
  const [open, setOpen] = useState(false)

  const githubConnected = useAppStore((s) => s.githubConnected)
  const n8nConnected = useAppStore((s) => s.n8nConnected)
  const selectedRepo = useAppStore((s) => s.selectedRepo)
  const selectedBranch = useAppStore((s) => s.selectedBranch)

  const closePopup = useCallback(() => setOpen(false), [])

  return (
    <>
      <button
        type="button"
        title="git8git"
        data-fab-button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-12 h-12 rounded-full cursor-pointer transition-all duration-150 border border-neutral-500/40 bg-neutral-800 text-neutral-200 shadow-lg hover:bg-neutral-700 hover:border-neutral-500/60 hover:shadow-xl"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <line x1="3" y1="12" x2="9" y2="12" />
          <line x1="15" y1="12" x2="21" y2="12" />
          <circle cx="6" cy="6" r="2" />
          <line x1="6" y1="8" x2="6" y2="12" />
          <circle cx="18" cy="18" r="2" />
          <line x1="18" y1="12" x2="18" y2="16" />
        </svg>
      </button>

      {open && (
        <SettingsPopup onClose={closePopup} anchor="bottom" portal={false}>
          {githubConnected && n8nConnected && (
            <WorkflowButtons repo={selectedRepo} branch={selectedBranch} compact />
          )}
        </SettingsPopup>
      )}
    </>
  )
}
