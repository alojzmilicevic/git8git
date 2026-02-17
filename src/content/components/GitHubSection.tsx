import gitLogo from '../../assets/git.svg'
import { useAppStore } from '../store'

interface Props {
  connected?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
}

export function GitHubSection({ connected = false, onConnect, onDisconnect }: Props) {
  const repos = useAppStore((s) => s.repos)
  const branches = useAppStore((s) => s.branches)
  const selectedRepo = useAppStore((s) => s.selectedRepo)
  const selectedBranch = useAppStore((s) => s.selectedBranch)
  const reposLoading = useAppStore((s) => s.reposLoading)
  const reposError = useAppStore((s) => s.reposError)
  const branchesLoading = useAppStore((s) => s.branchesLoading)
  const branchesError = useAppStore((s) => s.branchesError)
  const setSelectedRepo = useAppStore((s) => s.setSelectedRepo)
  const setSelectedBranch = useAppStore((s) => s.setSelectedBranch)
  const fetchRepos = useAppStore((s) => s.fetchRepos)

  function handleRepoChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedRepo(event.target.value)
  }

  function handleBranchChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedBranch(event.target.value)
  }

  function handleRefresh() {
    fetchRepos(true)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
        GitHub
      </div>

      {connected ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-500">
              <img src={gitLogo} alt="" className="w-4 h-4" />
              <span>Connected</span>
            </div>
            <button
              type="button"
              className="text-xs text-neutral-500 bg-transparent border-none cursor-pointer hover:text-neutral-700"
              onClick={onDisconnect}
            >
              Disconnect
            </button>
          </div>

          {reposError && (
            <div className="text-xs text-red-500 p-2 bg-red-50 rounded-md">
              {reposError}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Repository</span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={reposLoading}
                  title="Refresh repositories"
                  className="bg-transparent border-none p-0.5 cursor-pointer text-neutral-500 flex items-center justify-center hover:text-neutral-700"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${reposLoading ? 'animate-spin' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M21 21v-5h-5" />
                  </svg>
                </button>
              </div>
              <select
                value={selectedRepo}
                onChange={handleRepoChange}
                disabled={reposLoading}
                className="w-full px-2 py-1.5 rounded-md text-[13px] bg-neutral-100 border border-neutral-300 text-neutral-800"
              >
                <option value="">{reposLoading ? 'Loading...' : 'Select repository...'}</option>
                {repos.map((repo) => (
                  <option key={repo.fullName} value={repo.fullName}>
                    {repo.fullName.split('/')[1]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500">Branch</span>
              <select
                value={selectedBranch}
                onChange={handleBranchChange}
                disabled={!selectedRepo || branchesLoading}
                className="w-full px-2 py-1.5 rounded-md text-[13px] bg-neutral-100 border border-neutral-300 text-neutral-800"
              >
                <option value="">{branchesLoading ? 'Loading...' : 'Select branch...'}</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              {branchesError && (
                <span className="text-[11px] text-red-500">Failed to load branches</span>
              )}
            </label>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg text-[13px] font-medium cursor-pointer border border-neutral-300 bg-neutral-100 text-neutral-800 transition-all duration-150 hover:bg-neutral-200"
          onClick={(e) => {
            e.stopPropagation()
            onConnect?.()
          }}
        >
          <img src={gitLogo} alt="" className="w-[18px] h-[18px]" />
          <span>Connect to GitHub</span>
        </button>
      )}
    </div>
  )
}
