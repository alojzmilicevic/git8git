<script lang="ts">
  interface Props {
    workflowName: string
    repo: string
    branch: string
    onConfirm: (message: string) => void
    onCancel: () => void
  }

  let { workflowName, repo, branch, onConfirm, onCancel }: Props = $props()

  // Initialize with default message (not reactive - set once)
  let commitMessage = $state(`Update workflow: ${workflowName}`)

  function handleSubmit() {
    if (commitMessage.trim()) {
      onConfirm(commitMessage.trim())
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onCancel()
    } else if (event.key === 'Enter' && event.metaKey) {
      handleSubmit()
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onCancel()
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  style="
    position: fixed !important;
    inset: 0 !important;
    background: rgba(0, 0, 0, 0.5) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 2147483647 !important;
  "
  onclick={handleBackdropClick}
  onkeydown={handleKeydown}
  role="dialog"
  tabindex="-1"
>
  <div
    style="
      background: white !important;
      border-radius: 12px !important;
      padding: 20px !important;
      width: 400px !important;
      max-width: 90vw !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
    "
    onclick={(e) => e.stopPropagation()}
  >
    <div style="font-size: 16px !important; font-weight: 600 !important; color: #171717 !important; margin-bottom: 16px !important;">
      Push to GitHub
    </div>

    <div style="display: flex !important; flex-direction: column !important; gap: 12px !important; margin-bottom: 20px !important;">
      <div style="display: flex !important; flex-direction: column !important; gap: 4px !important;">
        <span style="font-size: 12px !important; color: #737373 !important;">Workflow</span>
        <span style="font-size: 14px !important; color: #262626 !important; font-weight: 500 !important;">{workflowName}</span>
      </div>

      <div style="display: flex !important; flex-direction: column !important; gap: 4px !important;">
        <span style="font-size: 12px !important; color: #737373 !important;">Destination</span>
        <span style="font-size: 14px !important; color: #262626 !important;">
          {repo} <span style="color: #737373 !important;">({branch})</span>
        </span>
      </div>

      <div style="display: flex !important; flex-direction: column !important; gap: 4px !important;">
        <label for="commit-message" style="font-size: 12px !important; color: #737373 !important;">Commit message</label>
        <textarea
          id="commit-message"
          bind:value={commitMessage}
          rows="3"
          style="
            width: 100% !important;
            padding: 10px !important;
            border-radius: 8px !important;
            border: 1px solid #d4d4d4 !important;
            font-size: 14px !important;
            font-family: inherit !important;
            resize: vertical !important;
            background: white !important;
            color: #262626 !important;
            box-sizing: border-box !important;
          "
        ></textarea>
        <span style="font-size: 11px !important; color: #a3a3a3 !important;">⌘+Enter to push</span>
      </div>
    </div>

    <div style="display: flex !important; gap: 8px !important; justify-content: flex-end !important;">
      <button
        type="button"
        onclick={onCancel}
        style="
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          border: 1px solid #d4d4d4 !important;
          background: white !important;
          color: #525252 !important;
        "
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={handleSubmit}
        disabled={!commitMessage.trim()}
        style="
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          border: none !important;
          background: #10b981 !important;
          color: white !important;
          opacity: {commitMessage.trim() ? '1' : '0.5'} !important;
        "
      >
        Push
      </button>
    </div>
  </div>
</div>
