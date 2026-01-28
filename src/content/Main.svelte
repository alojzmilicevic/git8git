<script lang="ts">
  import { onMount } from 'svelte'
  import WorkflowButtons from './WorkflowButtons.svelte'
  import SettingsButton from './components/SettingsButton.svelte'
  import SettingsPopup from './components/SettingsPopup.svelte'
  import { appState, initializeStore } from './store.svelte'

  let showSettings = $state(false)

  function toggleSettings() {
    showSettings = !showSettings
  }

  function closeSettings() {
    showSettings = false
  }

  onMount(() => {
    initializeStore()
  })
</script>

<div style="display: flex !important; align-items: center !important; gap: 8px !important; margin-left: 8px !important; position: relative !important; z-index: 2147483647 !important;">
  <div style="width: 1px !important; height: 20px !important; flex-shrink: 0 !important; background-color: #737373 !important;"></div>

  {#if appState.githubConnected && appState.n8nConnected}
    <WorkflowButtons repo={appState.selectedRepo} branch={appState.selectedBranch} />
  {/if}

  <SettingsButton onclick={toggleSettings} />

  {#if showSettings}
    <SettingsPopup onClose={closeSettings} />
  {/if}
</div>
