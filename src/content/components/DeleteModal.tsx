import { createPortal } from 'react-dom'
import { getOverlayRoot } from '../shadowPorts'

interface Props {
  workflowName: string
  repo: string
  branch: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteModal({ workflowName, repo, branch, onConfirm, onCancel }: Props) {
  function handleKeydown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onCancel()
    }
  }

  function handleBackdropClick(event: React.MouseEvent) {
    if (event.target === event.currentTarget) {
      onCancel()
    }
  }

  return createPortal(
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
          Delete from GitHub
        </div>

        <div className="flex flex-col gap-3 mb-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Workflow</span>
            <span className="text-sm text-neutral-800 font-medium">{workflowName}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Repository</span>
            <span className="text-sm text-neutral-800">
              {repo} <span className="text-neutral-500">({branch})</span>
            </span>
          </div>

          <div className="text-sm text-neutral-600">
            This will remove the workflow file and update the index in the GitHub repository. This action cannot be undone.
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="py-2 px-4 rounded-lg text-sm font-medium cursor-pointer border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="py-2 px-4 rounded-lg text-sm font-medium cursor-pointer border-none bg-red-500 text-white hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    getOverlayRoot(),
  )
}
