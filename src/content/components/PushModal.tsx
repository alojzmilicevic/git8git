import { useState } from 'react'

interface Props {
  workflowName: string
  repo: string
  branch: string
  onConfirm: (message: string) => void
  onCancel: () => void
}

export function PushModal({ workflowName, repo, branch, onConfirm, onCancel }: Props) {
  const [commitMessage, setCommitMessage] = useState(`Update workflow: ${workflowName}`)

  function handleSubmit() {
    if (commitMessage.trim()) {
      onConfirm(commitMessage.trim())
    }
  }

  function handleKeydown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onCancel()
    } else if (event.key === 'Enter' && event.metaKey) {
      handleSubmit()
    }
  }

  function handleBackdropClick(event: React.MouseEvent) {
    if (event.target === event.currentTarget) {
      onCancel()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2147483647]"
      onClick={handleBackdropClick}
      onKeyDown={handleKeydown}
      role="dialog"
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-xl p-5 w-[400px] max-w-[90vw] shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-semibold text-neutral-900 mb-4">
          Push to GitHub
        </div>

        <div className="flex flex-col gap-3 mb-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Workflow</span>
            <span className="text-sm text-neutral-800 font-medium">{workflowName}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Destination</span>
            <span className="text-sm text-neutral-800">
              {repo} <span className="text-neutral-500">({branch})</span>
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="commit-message" className="text-xs text-neutral-500">
              Commit message
            </label>
            <textarea
              id="commit-message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-lg border border-neutral-300 text-sm font-[inherit] resize-y bg-white text-neutral-800 box-border"
            />
            <span className="text-[11px] text-neutral-400">{'\u2318'}+Enter to push</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border border-neutral-300 bg-white text-neutral-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!commitMessage.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-500 text-white ${
              commitMessage.trim() ? 'opacity-100' : 'opacity-50'
            }`}
          >
            Push
          </button>
        </div>
      </div>
    </div>
  )
}
