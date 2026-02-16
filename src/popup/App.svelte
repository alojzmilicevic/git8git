<script lang="ts">
  import type { BackgroundRequest, BackgroundResponse, GitHubRepo } from '../shared/messages'
  import { onMount } from 'svelte'

  let authenticated = false
  let loading = false
  let error: string | null = null
  let activity: string[] = []
  let repos: GitHubRepo[] = []

  const REQUIRED_URL = 'https://automation.alostuff.com/home/workflows'
  let allowedPage = false

  function send(message: BackgroundRequest): Promise<BackgroundResponse> {
    return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve))
  }

  function log(line: string) {
    const ts = new Date().toLocaleTimeString()
    activity = [`${ts} — ${line}`, ...activity].slice(0, 6)
  }

  function isAllowed(rawUrl: string | undefined): boolean {
    if (!rawUrl) return false
    try {
      const url = new URL(rawUrl)
      if (url.protocol !== 'http:') return false
      if (url.hostname !== 'localhost') return false
      if (url.port !== '5678') return false

      if (url.pathname === '/home/workflows' || url.pathname.startsWith('/home/workflows/')) return true
      if (url.hash === '#/home/workflows' || url.hash.startsWith('#/home/workflows/')) return true

      return false
    } catch {
      return false
    }
  }

  async function checkAllowedPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    allowedPage = isAllowed(tab?.url)
    return allowedPage
  }

  async function openRequiredPage() {
    await chrome.tabs.create({ url: REQUIRED_URL })
    window.close()
  }
 
  async function refreshAuthAndRepos() {
    error = null
    log('Checking auth status…')
    const status = await send({ type: 'auth/status' })
    if (!status.ok || status.type !== 'auth/status') {
      throw new Error(status.ok ? 'Unexpected response.' : status.error)
    }

    authenticated = status.authenticated
    log(authenticated ? 'Signed in.' : 'Not signed in.')
    if (authenticated) {
      log('Fetching repos…')
      const res = await send({ type: 'repos/list' })
      if (!res.ok || res.type !== 'repos/list') {
        throw new Error(res.ok ? 'Unexpected response.' : res.error)
      }
      repos = res.repos
      log(`Loaded ${repos.length} repos.`)
    } else {
      repos = []
    }
  }

  async function logout() {
    loading = true
    error = null
    try {
      const res = await send({ type: 'auth/logout' })
      if (!res.ok) throw new Error(res.error)
      await refreshAuthAndRepos()
      log('Logged out.')
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      log(`Error: ${error}`)
    } finally {
      loading = false
    }
  }

  onMount(() => {
    ;(async () => {
      await checkAllowedPage()
      if (!allowedPage) return
      await refreshAuthAndRepos()
    })().catch((e) => {
      error = e instanceof Error ? e.message : String(e)
      log(`Error: ${error}`)
    })
  })
</script>

<main class="h-full w-full p-4 text-neutral-100">
  <div class="flex h-full flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 shadow-sm">
    <!-- Header -->
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-lg font-semibold tracking-tight">git8git</h1>
        <p class="mt-0.5 text-xs text-neutral-400">
          Placeholder UI for GitHub ↔ n8n sync
        </p>
      </div>
      <div class="flex items-center gap-2">
        {#if authenticated}
          <button
            type="button"
            class="rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-300 hover:bg-neutral-800"
            on:click={logout}
            disabled={loading}
            title="Sign out"
          >
            Logout
          </button>
        {/if}
        <span class="shrink-0 rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-300">
          v0.1
        </span>
      </div>
    </header>

    <!-- Status -->
    <section class="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
      <div class="flex items-center gap-2">
        <span class="h-2 w-2 rounded-full {authenticated ? 'bg-emerald-400' : 'bg-neutral-500'}"></span>
        <span class="text-sm text-neutral-200">{authenticated ? 'Signed in' : 'Not signed in'}</span>
      </div>
      <span class="text-xs text-neutral-400">Last sync: —</span>
    </section>

    {#if !allowedPage}
      <section class="rounded-xl border border-neutral-800 bg-neutral-900/20 p-3">
        <p class="text-xs font-medium text-neutral-300">n8n required</p>
        <p class="mt-1 text-sm text-neutral-200">
          Open the n8n workflows page to use this extension.
        </p>
        <p class="mt-1 text-xs text-neutral-500">
          Required: <code class="rounded bg-neutral-900 px-1">{REQUIRED_URL}</code>
        </p>
        <button
          type="button"
          class="mt-3 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-800 active:scale-[0.99]"
          on:click={openRequiredPage}
        >
          Open n8n workflows
        </button>
      </section>
    {:else if !authenticated}
      <section class="rounded-xl border border-neutral-800 bg-neutral-900/20 p-3">
        <p class="text-xs font-medium text-neutral-300">GitHub</p>
        <p class="mt-1 text-sm text-neutral-200">Sign in to list your repositories.</p>
        <p class="mt-1 text-xs text-neutral-500">
          Sign-in is now handled directly from the n8n workflow page settings.
        </p>
      </section>
    {:else}
      <!-- Repos -->
      <section class="rounded-xl border border-neutral-800 bg-neutral-900/20 p-3">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-neutral-300">Your repos</p>
          <p class="text-xs text-neutral-500">{repos.length}</p>
        </div>

        <div class="mt-2 max-h-44 space-y-1 overflow-auto pr-1">
          {#each repos as repo (repo.id)}
            <a
              class="block truncate rounded-lg border border-transparent px-2 py-1 text-sm text-neutral-200 hover:border-neutral-800 hover:bg-neutral-900"
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              title={repo.full_name}
            >
              <span class="mr-2 inline-block rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] text-neutral-400">
                {repo.private ? 'private' : 'public'}
              </span>
              {repo.full_name}
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Primary actions -->
    <section class="grid grid-cols-2 gap-3">
      <button
        type="button"
        class="group flex flex-col gap-1 rounded-2xl border border-emerald-600/40 bg-emerald-500/10 p-3 text-left transition hover:bg-emerald-500/15 active:scale-[0.99]"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-emerald-200">Push</span>
          <span class="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200">⬆</span>
        </div>
        <p class="text-xs text-emerald-200/80">n8n → GitHub (upload current workflow JSON)</p>
      </button>

      <button
        type="button"
        class="group flex flex-col gap-1 rounded-2xl border border-sky-600/40 bg-sky-500/10 p-3 text-left transition hover:bg-sky-500/15 active:scale-[0.99]"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-sky-200">Pull</span>
          <span class="rounded-lg bg-sky-500/15 px-2 py-0.5 text-xs text-sky-200">⬇</span>
        </div>
        <p class="text-xs text-sky-200/80">GitHub → n8n (apply JSON from repo)</p>
      </button>
    </section>

    <!-- Small activity area (super useful later; still placeholder now) -->
    <section class="mt-auto rounded-xl border border-neutral-800 bg-neutral-900/20 p-3">
      <p class="text-xs font-medium text-neutral-300">Activity</p>
      {#if error}
        <p class="mt-1 text-xs text-rose-300">{error}</p>
      {:else}
        {#if activity.length === 0}
          <p class="mt-1 text-xs text-neutral-500">No activity yet.</p>
        {:else}
          <ul class="mt-1 space-y-1 text-xs text-neutral-500">
            {#each activity as line}
              <li class="truncate" title={line}>{line}</li>
            {/each}
          </ul>
        {/if}
      {/if}
    </section>
  </div>
</main>
