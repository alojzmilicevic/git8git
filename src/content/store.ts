import { create } from 'zustand'
import { githubApi, type Repo, type Branch } from '../shared/api'
import { DEFAULT_N8N_URL } from '../shared/config'

interface AppState {
  githubConnected: boolean
  n8nConnected: boolean
  n8nBaseUrl: string
  selectedRepo: string
  selectedBranch: string
  initialized: boolean
  repos: Repo[]
  branches: Branch[]
  reposLoading: boolean
  reposError: string
  branchesLoading: boolean
  branchesError: string
}

interface AppActions {
  initializeStore: () => void
  setSelectedRepo: (repo: string) => void
  setSelectedBranch: (branch: string) => void
  disconnectGitHub: () => void
  disconnectN8n: () => void
  fetchRepos: (force?: boolean) => Promise<void>
  fetchBranches: (repoFullName: string) => Promise<void>
  saveN8nConfig: (apiKey: string, baseUrl: string) => void
}

export const useAppStore = create<AppState & AppActions>()((set, get) => {
  let storageListenerAttached = false

  function attachStorageListener() {
    if (storageListenerAttached) return
    if (typeof chrome === 'undefined' || !chrome.storage) return
    storageListenerAttached = true

    chrome.storage.onChanged.addListener((changes) => {
      const state = get()
      const updates: Partial<AppState> = {}

      if (changes.tokenData) {
        const wasConnected = state.githubConnected
        const nowConnected = Boolean(changes.tokenData.newValue)
        updates.githubConnected = nowConnected

        if (!wasConnected && nowConnected) {
          // Will fetch repos after set
          setTimeout(() => get().fetchRepos(), 0)
        }
        if (wasConnected && !nowConnected) {
          updates.repos = []
          updates.branches = []
          updates.reposError = ''
        }
      }
      if (changes.n8nApiKey) {
        updates.n8nConnected = Boolean(changes.n8nApiKey.newValue)
      }
      if (changes.n8nBaseUrl) {
        updates.n8nBaseUrl = (changes.n8nBaseUrl.newValue as string) || DEFAULT_N8N_URL
      }
      if (changes.selectedRepo) {
        updates.selectedRepo = (changes.selectedRepo.newValue as string) || ''
      }
      if (changes.selectedBranch) {
        updates.selectedBranch = (changes.selectedBranch.newValue as string) || ''
      }

      if (Object.keys(updates).length > 0) {
        set(updates)
      }
    })
  }

  return {
    // State
    githubConnected: false,
    n8nConnected: false,
    n8nBaseUrl: DEFAULT_N8N_URL,
    selectedRepo: '',
    selectedBranch: '',
    initialized: false,
    repos: [],
    branches: [],
    reposLoading: false,
    reposError: '',
    branchesLoading: false,
    branchesError: '',

    // Actions
    initializeStore: () => {
      if (get().initialized) return

      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('[git8git] Chrome storage not available')
        set({ initialized: true })
        return
      }

      chrome.storage.local.get(
        ['tokenData', 'n8nApiKey', 'n8nBaseUrl', 'selectedRepo', 'selectedBranch'],
        (result) => {
          const githubConnected = Boolean(result.tokenData)
          set({
            githubConnected,
            n8nConnected: Boolean(result.n8nApiKey),
            n8nBaseUrl: (result.n8nBaseUrl as string) || DEFAULT_N8N_URL,
            selectedRepo: (result.selectedRepo as string) || '',
            selectedBranch: (result.selectedBranch as string) || '',
            initialized: true,
          })

          if (githubConnected) {
            get().fetchRepos()
          }
        }
      )

      attachStorageListener()
    },

    setSelectedRepo: (repo: string) => {
      set({ selectedRepo: repo, selectedBranch: '', branches: [] })
      chrome.storage.local.set({ selectedRepo: repo, selectedBranch: '' })
      if (repo) {
        get().fetchBranches(repo)
      }
    },

    setSelectedBranch: (branch: string) => {
      set({ selectedBranch: branch })
      chrome.storage.local.set({ selectedBranch: branch })
    },

    disconnectGitHub: () => {
      set({
        githubConnected: false,
        selectedRepo: '',
        selectedBranch: '',
        repos: [],
        branches: [],
        reposError: '',
        branchesError: '',
      })
      chrome.storage.local.remove(['tokenData', 'selectedRepo', 'selectedBranch'])
    },

    disconnectN8n: () => {
      set({ n8nConnected: false, n8nBaseUrl: DEFAULT_N8N_URL })
      chrome.storage.local.remove(['n8nApiKey', 'n8nBaseUrl'])
    },

    fetchRepos: async (force = false) => {
      const state = get()
      if (state.reposLoading && !force) return
      if (!state.githubConnected) return

      console.log('[git8git] Fetching repos...')
      set({ reposLoading: true, reposError: '' })

      try {
        const repos = await githubApi.listRepos()
        console.log('[git8git] Fetched', repos.length, 'repos')

        const currentState = get()
        if (currentState.selectedRepo) {
          const repoExists = repos.some((r) => r.fullName === currentState.selectedRepo)
          if (!repoExists) {
            console.log('[git8git] Selected repo no longer exists, clearing selection')
            set({ repos, selectedRepo: '', selectedBranch: '', branches: [], reposLoading: false })
            chrome.storage.local.set({ selectedRepo: '', selectedBranch: '' })
            return
          }
          set({ repos, reposLoading: false })
          await get().fetchBranches(currentState.selectedRepo)
        } else {
          set({ repos, reposLoading: false })
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load repositories'
        console.error('[git8git] Failed to fetch repos:', e)

        if (message.includes('Not authenticated') || message.includes('401') || message.includes('Unauthorized')) {
          console.log('[git8git] Auth failed, disconnecting GitHub')
          get().disconnectGitHub()
        } else {
          set({ reposError: message })
        }
        set({ reposLoading: false })
      }
    },

    fetchBranches: async (repoFullName: string) => {
      if (!repoFullName) {
        set({ branches: [], branchesError: '' })
        return
      }

      set({ branches: [], selectedBranch: '', branchesLoading: true, branchesError: '' })

      try {
        const branches = await githubApi.listBranches(repoFullName)

        const savedBranch = await new Promise<string>((resolve) => {
          chrome.storage.local.get('selectedBranch', (result) => {
            resolve((result.selectedBranch as string) || '')
          })
        })

        if (savedBranch && branches.some((b) => b.name === savedBranch)) {
          set({ branches, selectedBranch: savedBranch, branchesLoading: false })
        } else {
          if (savedBranch) {
            console.log('[git8git] Selected branch no longer exists, clearing selection')
            chrome.storage.local.set({ selectedBranch: '' })
          }
          set({ branches, branchesLoading: false })
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to fetch branches'
        console.error('[git8git] Failed to fetch branches:', e)
        set({ branchesError: message, branchesLoading: false })
        chrome.storage.local.set({ selectedBranch: '' })
      }
    },

    saveN8nConfig: (apiKey: string, baseUrl: string) => {
      set({ n8nConnected: true, n8nBaseUrl: baseUrl || DEFAULT_N8N_URL })
      chrome.storage.local.set({
        n8nApiKey: apiKey,
        n8nBaseUrl: baseUrl || DEFAULT_N8N_URL,
      })
    },
  }
})
