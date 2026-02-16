import { githubApi, type Repo, type Branch } from '../shared/api'

interface AppState {
  githubConnected: boolean
  n8nConnected: boolean
  n8nBaseUrl: string
  selectedRepo: string
  selectedBranch: string
  initialized: boolean
  // Cached data
  repos: Repo[]
  branches: Branch[]
  reposLoading: boolean
  reposError: string
  branchesLoading: boolean
  branchesError: string
}

export const DEFAULT_N8N_URL = 'https://automation.alostuff.com'

// Singleton reactive state
export const appState: AppState = $state({
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
  branchesError: ''
})

let storageListener: ((changes: { [key: string]: chrome.storage.StorageChange }) => void) | null = null

/**
 * Initialize store from chrome.storage. Call once at app startup.
 */
export function initializeStore(): void {
  if (appState.initialized) return
  
  // Guard against non-extension context (e.g., HMR, tests)
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('[git8git] Chrome storage not available')
    appState.initialized = true
    return
  }

  chrome.storage.local.get(['tokenData', 'n8nApiKey', 'n8nBaseUrl', 'selectedRepo', 'selectedBranch'], (result) => {
    appState.githubConnected = Boolean(result.tokenData)
    appState.n8nConnected = Boolean(result.n8nApiKey)
    appState.n8nBaseUrl = (result.n8nBaseUrl as string) || DEFAULT_N8N_URL
    appState.selectedRepo = (result.selectedRepo as string) || ''
    appState.selectedBranch = (result.selectedBranch as string) || ''
    appState.initialized = true
    
    // Pre-fetch repos if connected
    if (appState.githubConnected) {
      fetchRepos()
    }
  })

  // Listen for external changes (e.g., from background script setting tokenData)
  if (!storageListener) {
    storageListener = (changes) => {
      if (changes.tokenData) {
        const wasConnected = appState.githubConnected
        appState.githubConnected = Boolean(changes.tokenData.newValue)
        
        // Fetch repos when newly connected
        if (!wasConnected && appState.githubConnected) {
          fetchRepos()
        }
        // Clear cache when disconnected
        if (wasConnected && !appState.githubConnected) {
          appState.repos = []
          appState.branches = []
          appState.reposError = ''
        }
      }
      if (changes.n8nApiKey) {
        appState.n8nConnected = Boolean(changes.n8nApiKey.newValue)
      }
      if (changes.n8nBaseUrl) {
        appState.n8nBaseUrl = (changes.n8nBaseUrl.newValue as string) || DEFAULT_N8N_URL
      }
      if (changes.selectedRepo) {
        appState.selectedRepo = (changes.selectedRepo.newValue as string) || ''
      }
      if (changes.selectedBranch) {
        appState.selectedBranch = (changes.selectedBranch.newValue as string) || ''
      }
    }
    chrome.storage.onChanged.addListener(storageListener)
  }
}

// ============ Actions ============
// These modify BOTH local state AND storage atomically

export function setSelectedRepo(repo: string): void {
  appState.selectedRepo = repo
  appState.selectedBranch = '' // Reset branch when repo changes
  appState.branches = [] // Clear branches while loading
  chrome.storage.local.set({ selectedRepo: repo, selectedBranch: '' })
  
  if (repo) {
    fetchBranches(repo)
  }
}

export function setSelectedBranch(branch: string): void {
  appState.selectedBranch = branch
  chrome.storage.local.set({ selectedBranch: branch })
}

export function disconnectGitHub(): void {
  // Clear local state immediately for responsive UI
  appState.githubConnected = false
  appState.selectedRepo = ''
  appState.selectedBranch = ''
  appState.repos = []
  appState.branches = []
  appState.reposError = ''
  appState.branchesError = ''
  // Then persist to storage
  chrome.storage.local.remove(['tokenData', 'selectedRepo', 'selectedBranch'])
}

/**
 * Fetch repos from GitHub API. Called when GitHub is connected.
 * @param force - If true, refetch even if already loading
 */
export async function fetchRepos(force = false): Promise<void> {
  if (appState.reposLoading && !force) return
  if (!appState.githubConnected) return
  
  console.log('[git8git] Fetching repos...')
  appState.reposLoading = true
  appState.reposError = ''
  
  try {
    appState.repos = await githubApi.listRepos()
    console.log('[git8git] Fetched', appState.repos.length, 'repos')
    
    // Validate selected repo still exists
    if (appState.selectedRepo) {
      const repoExists = appState.repos.some(r => r.fullName === appState.selectedRepo)
      if (!repoExists) {
        console.log('[git8git] Selected repo no longer exists, clearing selection')
        appState.selectedRepo = ''
        appState.selectedBranch = ''
        appState.branches = []
        chrome.storage.local.set({ selectedRepo: '', selectedBranch: '' })
      } else {
        // Repo exists, fetch and validate branches
        await fetchBranches(appState.selectedRepo)
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load repositories'
    console.error('[git8git] Failed to fetch repos:', e)
    
    // If auth failed, disconnect GitHub
    if (message.includes('Not authenticated') || message.includes('401') || message.includes('Unauthorized')) {
      console.log('[git8git] Auth failed, disconnecting GitHub')
      disconnectGitHub()
    } else {
      appState.reposError = message
    }
  } finally {
    appState.reposLoading = false
  }
}

/**
 * Fetch branches for a specific repo and validate selection.
 */
export async function fetchBranches(repoFullName: string): Promise<void> {
  if (!repoFullName) {
    appState.branches = []
    appState.branchesError = ''
    return
  }
  
  // Clear stale data immediately
  appState.branches = []
  appState.selectedBranch = ''
  appState.branchesLoading = true
  appState.branchesError = ''
  
  try {
    const branches = await githubApi.listBranches(repoFullName)
    appState.branches = branches
    
    // Restore selection if branch still exists
    const savedBranch = await new Promise<string>((resolve) => {
      chrome.storage.local.get('selectedBranch', (result) => {
        resolve((result.selectedBranch as string) || '')
      })
    })
    
    if (savedBranch && branches.some(b => b.name === savedBranch)) {
      appState.selectedBranch = savedBranch
    } else if (savedBranch) {
      // Saved branch no longer exists, clear it
      console.log('[git8git] Selected branch no longer exists, clearing selection')
      chrome.storage.local.set({ selectedBranch: '' })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch branches'
    console.error('[git8git] Failed to fetch branches:', e)
    appState.branchesError = message
    chrome.storage.local.set({ selectedBranch: '' })
  } finally {
    appState.branchesLoading = false
  }
}

export function saveN8nConfig(apiKey: string, baseUrl: string): void {
  appState.n8nConnected = true
  appState.n8nBaseUrl = baseUrl || DEFAULT_N8N_URL
  chrome.storage.local.set({ 
    n8nApiKey: apiKey, 
    n8nBaseUrl: baseUrl || DEFAULT_N8N_URL 
  })
}

export function disconnectN8n(): void {
  appState.n8nConnected = false
  appState.n8nBaseUrl = DEFAULT_N8N_URL
  chrome.storage.local.remove(['n8nApiKey', 'n8nBaseUrl'])
}
