import { useState, useMemo } from 'react'
import { getWorkflow, getWorkflowIdFromUrl, sanitizeFilename, type N8nWorkflow } from '../shared/n8nApi'
import { githubApi } from '../shared/api'
import { PushModal } from './components/PushModal'

interface WorkflowIndex {
  [workflowId: string]: string
}

async function getIndex(repo: string, branch: string): Promise<{ index: WorkflowIndex; sha: string | null }> {
  try {
    const result = await githubApi.getFileContent(repo, 'workflows/index.json', branch)
    return { index: JSON.parse(result.content), sha: result.sha }
  } catch {
    return { index: {}, sha: null }
  }
}

interface Props {
  repo: string
  branch: string
}

export function WorkflowButtons({ repo, branch }: Props) {
  const [pushing, setPushing] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [status, setStatus] = useState('')
  const [showPushModal, setShowPushModal] = useState(false)
  const [pendingWorkflow, setPendingWorkflow] = useState<N8nWorkflow | null>(null)

  const isConfigured = useMemo(() => Boolean(repo && branch), [repo, branch])
  const repoName = useMemo(() => (repo ? repo.split('/')[1] : ''), [repo])

  function showStatusMsg(msg: string, duration = 3000) {
    setStatus(msg)
    setTimeout(() => setStatus(''), duration)
  }

  async function handlePushClick() {
    if (!isConfigured) return
    const workflowId = getWorkflowIdFromUrl()
    if (!workflowId) {
      showStatusMsg('Not on a workflow page')
      return
    }
    setStatus('Loading...')
    try {
      const workflow = await getWorkflow(workflowId)
      setPendingWorkflow(workflow)
      setShowPushModal(true)
      setStatus('')
    } catch (error) {
      console.error('[git8git] Error loading workflow:', error)
      showStatusMsg(`Error: ${error instanceof Error ? error.message : 'Failed to load'}`)
    }
  }

  function handlePushCancel() {
    setShowPushModal(false)
    setPendingWorkflow(null)
  }

  async function handlePushConfirm(commitMessage: string) {
    if (!pendingWorkflow) return
    setShowPushModal(false)
    setPushing(true)
    setStatus('Pushing...')

    const workflow = pendingWorkflow
    setPendingWorkflow(null)

    try {
      const { index, sha: indexSha } = await getIndex(repo, branch)

      let filename = index[workflow.id]
      if (!filename) {
        filename = `${sanitizeFilename(workflow.name)}.json`
        const existingFilenames = new Set(Object.values(index))
        let counter = 1
        let uniqueFilename = filename
        while (existingFilenames.has(uniqueFilename)) {
          uniqueFilename = `${sanitizeFilename(workflow.name)}-${counter}.json`
          counter++
        }
        filename = uniqueFilename
      }

      const exportData = {
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings,
        staticData: workflow.staticData,
        tags: workflow.tags,
      }

      let fileSha: string | undefined
      try {
        const existing = await githubApi.getFileContent(repo, `workflows/${filename}`, branch)
        fileSha = existing.sha
      } catch {
        // File doesn't exist yet
      }

      console.log('[git8git] Saving workflow file:', { repo, path: `workflows/${filename}`, branch, fileSha })
      const workflowResult = await githubApi.saveFile(
        repo,
        `workflows/${filename}`,
        JSON.stringify(exportData, null, 2),
        commitMessage,
        branch,
        fileSha
      )
      console.log('[git8git] Workflow saved:', workflowResult)

      const needsIndexUpdate = !index[workflow.id] || index[workflow.id] !== filename
      index[workflow.id] = filename

      if (needsIndexUpdate) {
        console.log('[git8git] Saving index:', { index, indexSha })
        await githubApi.saveFile(
          repo,
          'workflows/index.json',
          JSON.stringify(index, null, 2),
          'Update workflow index',
          branch,
          indexSha || undefined
        )
      }

      showStatusMsg(workflowResult.changed ? 'Pushed!' : 'No changes to push', 2000)
    } catch (error) {
      console.error('[git8git] Push error:', error)
      showStatusMsg(`Error: ${error instanceof Error ? error.message : 'Push failed'}`, 5000)
    } finally {
      setPushing(false)
    }
  }

  async function handlePull() {
    if (!isConfigured) return
    const workflowId = getWorkflowIdFromUrl()
    if (!workflowId) {
      showStatusMsg('Not on a workflow page')
      return
    }

    setPulling(true)
    setStatus('Pulling...')

    try {
      const { index } = await getIndex(repo, branch)
      const filename = index[workflowId]

      if (!filename) {
        showStatusMsg('Workflow not in repo')
        setPulling(false)
        return
      }

      const result = await githubApi.getFileContent(repo, `workflows/${filename}`, branch)
      const workflowData = JSON.parse(result.content) as N8nWorkflow

      const { updateWorkflow } = await import('../shared/n8nApi')
      await updateWorkflow(workflowId, {
        name: workflowData.name,
        nodes: workflowData.nodes,
        connections: workflowData.connections,
        settings: workflowData.settings,
        staticData: workflowData.staticData,
      })

      setStatus('Pulled!')
      setTimeout(() => {
        setStatus('')
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('[git8git] Pull error:', error)
      showStatusMsg(`Error: ${error instanceof Error ? error.message : 'Pull failed'}`, 5000)
    } finally {
      setPulling(false)
    }
  }

  const busy = pushing || pulling

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Repo/Branch indicator */}
        {isConfigured ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-800/50 text-[11px] text-neutral-400">
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5v-9zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8.5V1.5zM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2v-3.25z" />
            </svg>
            <span className="font-medium text-neutral-300">{repoName}</span>
            <span className="text-neutral-500">/</span>
            <span>{branch}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-[11px] text-amber-400">
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575L6.457 1.047zM8 5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 5zm1 6a1 1 0 1 0-2 0 1 1 0 0 0 2 0z" />
            </svg>
            <span>Select repo &amp; branch</span>
          </div>
        )}

        <button
          type="button"
          title={isConfigured ? 'Push workflow to GitHub' : 'Select a repo and branch first'}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 border ${
            isConfigured
              ? 'cursor-pointer border-emerald-500/40 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 hover:border-emerald-500/60 active:scale-[0.98]'
              : 'cursor-not-allowed border-neutral-600/40 bg-neutral-600/15 text-neutral-500'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={handlePushClick}
          disabled={!isConfigured || busy}
        >
          <span>{pushing ? '...' : '\u2B06'}</span>
          <span>{pushing ? 'Pushing' : 'Push'}</span>
        </button>

        <button
          type="button"
          title={isConfigured ? 'Pull workflow from GitHub' : 'Select a repo and branch first'}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 border ${
            isConfigured
              ? 'cursor-pointer border-sky-400/40 bg-sky-400/15 text-sky-400 hover:bg-sky-400/25 hover:border-sky-400/60 active:scale-[0.98]'
              : 'cursor-not-allowed border-neutral-600/40 bg-neutral-600/15 text-neutral-500'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={handlePull}
          disabled={!isConfigured || busy}
        >
          <span>{pulling ? '...' : '\u2B07'}</span>
          <span>{pulling ? 'Pulling' : 'Pull'}</span>
        </button>

        {status && <span className="text-xs text-neutral-400 ml-1">{status}</span>}
      </div>

      {showPushModal && pendingWorkflow && (
        <PushModal
          workflowName={pendingWorkflow.name}
          repo={repo}
          branch={branch}
          onConfirm={handlePushConfirm}
          onCancel={handlePushCancel}
        />
      )}
    </>
  )
}
