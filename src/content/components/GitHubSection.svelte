<script lang="ts">
  import gitLogo from '../../assets/git.svg'
  import { appState, setSelectedRepo, setSelectedBranch, fetchRepos } from '../store.svelte'

  interface Props {
    connected?: boolean
    onConnect?: () => void
    onDisconnect?: () => void
  }

  let { connected = false, onConnect, onDisconnect }: Props = $props()

  function handleRepoChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value
    setSelectedRepo(value)
  }

  function handleBranchChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value
    setSelectedBranch(value)
  }

  function handleRefresh() {
    fetchRepos(true) // force refresh
  }
</script>

<svelte:head>
  {@html `<style>
    @keyframes git8git-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .git8git-spinning {
      animation: git8git-spin 1s linear infinite !important;
    }
  </style>`}
</svelte:head>

<div style="display: flex !important; flex-direction: column !important; gap: 12px !important;">
  <div style="font-size: 11px !important; font-weight: 600 !important; color: #737373 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important;">
    GitHub
  </div>

  {#if connected}
    <div style="display: flex !important; flex-direction: column !important; gap: 8px !important;">
      <div style="display: flex !important; align-items: center !important; justify-content: space-between !important;">
        <div style="display: flex !important; align-items: center !important; gap: 8px !important; font-size: 14px !important; color: #10b981 !important;">
          <img src={gitLogo} alt="" style="width: 16px !important; height: 16px !important;" />
          <span>Connected</span>
        </div>
        <button
          type="button"
          style="font-size: 12px !important; color: #737373 !important; background: none !important; border: none !important; cursor: pointer !important;"
          onclick={onDisconnect}
        >
          Disconnect
        </button>
      </div>

      {#if appState.reposError}
        <div style="font-size: 12px !important; color: #ef4444 !important; padding: 8px !important; background: #fef2f2 !important; border-radius: 6px !important;">
          {appState.reposError}
        </div>
      {/if}

      <div style="display: flex !important; flex-direction: column !important; gap: 8px !important;">
        <label style="display: flex !important; flex-direction: column !important; gap: 4px !important;">
          <div style="display: flex !important; align-items: center !important; justify-content: space-between !important;">
            <span style="font-size: 12px !important; color: #737373 !important;">Repository</span>
            <button
              type="button"
              onclick={handleRefresh}
              disabled={appState.reposLoading}
              title="Refresh repositories"
              style="
                background: none !important;
                border: none !important;
                padding: 2px !important;
                cursor: pointer !important;
                color: #737373 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              "
            >
              <svg
                class={appState.reposLoading ? 'git8git-spinning' : ''}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M21 21v-5h-5" />
              </svg>
            </button>
          </div>
          <select
            value={appState.selectedRepo}
            onchange={handleRepoChange}
            disabled={appState.reposLoading}
            style="width: 100% !important; padding: 6px 8px !important; border-radius: 6px !important; font-size: 13px !important; background: #f5f5f5 !important; border: 1px solid #d4d4d4 !important; color: #262626 !important;"
          >
            <option value="">{appState.reposLoading ? 'Loading...' : 'Select repository...'}</option>
            {#each appState.repos as repo}
              <option value={repo.fullName}>{repo.fullName.split("/")[1]}</option>
            {/each}
          </select>
        </label>

        <label style="display: flex !important; flex-direction: column !important; gap: 4px !important;">
          <span style="font-size: 12px !important; color: #737373 !important;">Branch</span>
          <select
            value={appState.selectedBranch}
            onchange={handleBranchChange}
            disabled={!appState.selectedRepo || appState.branchesLoading}
            style="width: 100% !important; padding: 6px 8px !important; border-radius: 6px !important; font-size: 13px !important; background: #f5f5f5 !important; border: 1px solid #d4d4d4 !important; color: #262626 !important;"
          >
            <option value="">{appState.branchesLoading ? 'Loading...' : 'Select branch...'}</option>
            {#each appState.branches as branch}
              <option value={branch.name}>{branch.name}</option>
            {/each}
          </select>
          {#if appState.branchesError}
            <span style="font-size: 11px !important; color: #ef4444 !important;">Failed to load branches</span>
          {/if}
        </label>
      </div>
    </div>
  {:else}
    <button
      type="button"
      style="
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        width: 100% !important;
        padding: 10px 12px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        border: 1px solid #d4d4d4 !important;
        background: #f5f5f5 !important;
        color: #262626 !important;
        transition: all 0.15s ease !important;
      "
      onclick={onConnect}
    >
      <img src={gitLogo} alt="" style="width: 18px !important; height: 18px !important;" />
      <span>Connect to GitHub</span>
    </button>
  {/if}
</div>
