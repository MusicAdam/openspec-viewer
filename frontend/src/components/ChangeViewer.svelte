<script lang="ts">
  import { onMount } from 'svelte';
  import { getChange, getChangeFileUrl, type Change, type FileGroup, type ChangeFile } from '../lib/api';
  import { navigateTo, changesRefreshTrigger } from '../stores/index';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  import HtmlRenderer from './HtmlRenderer.svelte';
  import TaskProgress from './TaskProgress.svelte';

  export let changeName: string;

  let change: Change | null = null;
  let loading = true;
  let error: string | null = null;
  let lastRefreshTrigger = 0;

  // Two-level navigation state
  let activeGroupIndex = 0;
  let activeFileIndex = 0;

  // Computed: current group and file
  $: activeGroup = change?.fileGroups[activeGroupIndex] ?? null;
  $: activeFile = activeGroup?.files[activeFileIndex] ?? null;

  // Special handling for deltas tab (always last if present)
  $: showDeltasTab = (change?.specDeltas.length ?? 0) > 0;
  $: isDeltasActive = activeGroupIndex === (change?.fileGroups.length ?? 0);

  onMount(async () => {
    await loadChange();
    lastRefreshTrigger = $changesRefreshTrigger;
  });

  // React to WebSocket refresh signals - preserve navigation state on hot reload
  $: if ($changesRefreshTrigger > lastRefreshTrigger) {
    lastRefreshTrigger = $changesRefreshTrigger;
    loadChange(true);
  }

  async function loadChange(preserveState = false) {
    // Only show loading state on initial load, not hot reload
    if (!preserveState) {
      loading = true;
    }
    error = null;

    // Save current navigation state for hot reload
    const savedGroupIndex = activeGroupIndex;
    const savedFileIndex = activeFileIndex;

    try {
      change = await getChange(changeName);

      if (preserveState && change) {
        // Restore navigation state, validating indices are still valid
        const maxGroupIndex = change.fileGroups.length + (change.specDeltas.length > 0 ? 1 : 0) - 1;
        activeGroupIndex = Math.min(savedGroupIndex, maxGroupIndex);

        const currentGroup = change.fileGroups[activeGroupIndex];
        const maxFileIndex = currentGroup ? currentGroup.files.length - 1 : 0;
        activeFileIndex = Math.min(savedFileIndex, Math.max(0, maxFileIndex));
      } else {
        // Reset selection on initial load or navigation
        activeGroupIndex = 0;
        activeFileIndex = 0;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load change';
    } finally {
      loading = false;
    }
  }

  function selectGroup(index: number) {
    activeGroupIndex = index;
    activeFileIndex = 0;
  }

  function selectDeltas() {
    activeGroupIndex = change?.fileGroups.length ?? 0;
  }

  $: if (changeName) loadChange();
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <button
      class="p-2 hover:bg-gray-700 rounded-lg"
      onclick={() => navigateTo('/changes')}
    >
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <div class="flex-1">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-gray-100">{changeName}</h1>
        {#if change?.isArchived}
          <span class="px-2 py-1 text-xs bg-gray-700 text-gray-400 rounded">Archived</span>
        {/if}
      </div>
      {#if change}
        <div class="flex items-center gap-4 mt-2">
          <div class="w-48">
            <TaskProgress progress={change.taskProgress} size="sm" />
          </div>
          <span class="text-sm text-gray-400">
            {change.taskProgress.done} of {change.taskProgress.total} tasks complete
          </span>
        </div>
      {/if}
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-64">
      <div class="text-gray-400">Loading...</div>
    </div>
  {:else if error}
    <div class="bg-red-900/50 border border-red-700 rounded-lg p-4">
      <p class="text-red-300">{error}</p>
    </div>
  {:else if change}
    <!-- Primary tabs: Groups + Deltas -->
    <div class="border-b border-gray-700">
      <nav class="flex space-x-4">
        {#each change.fileGroups as group, i}
          <button
            class="px-4 py-2 border-b-2 font-medium text-sm transition-colors {activeGroupIndex === i && !isDeltasActive
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'}"
            onclick={() => selectGroup(i)}
          >
            {group.name}
            {#if group.files.length > 1}
              <span class="ml-1 px-1.5 py-0.5 text-xs bg-gray-700 rounded-full">
                {group.files.length}
              </span>
            {/if}
          </button>
        {/each}

        {#if showDeltasTab}
          <button
            class="px-4 py-2 border-b-2 font-medium text-sm transition-colors {isDeltasActive
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'}"
            onclick={selectDeltas}
          >
            Spec Deltas
            <span class="ml-1 px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">
              {change.specDeltas.length}
            </span>
          </button>
        {/if}
      </nav>
    </div>

    <!-- Secondary tabs: Files within group (if multiple) -->
    {#if activeGroup && activeGroup.files.length > 1 && !isDeltasActive}
      <div class="flex space-x-2 px-2">
        {#each activeGroup.files as file, i}
          <button
            class="px-3 py-1.5 text-sm rounded-md transition-colors {activeFileIndex === i
              ? 'bg-gray-700 text-gray-100'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'}"
            onclick={() => (activeFileIndex = i)}
          >
            {file.name}
            {#if file.type === 'html'}
              <span class="ml-1 text-xs text-orange-400">HTML</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    <!-- Content area -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      {#if isDeltasActive}
        <!-- Spec Deltas -->
        <div class="space-y-8">
          {#each change.specDeltas as delta}
            <div>
              <h3 class="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <span class="px-2 py-1 text-sm bg-green-900 text-green-300 rounded">{delta.capability}</span>
              </h3>
              <MarkdownRenderer content={delta.content} highlightDiff={true} />
            </div>
          {/each}
        </div>
      {:else if activeFile}
        {#if activeFile.type === 'markdown' && activeFile.content}
          <MarkdownRenderer content={activeFile.content} />
        {:else if activeFile.type === 'html'}
          <HtmlRenderer
            src={getChangeFileUrl(changeName, activeFile.path)}
            title={activeFile.name}
          />
        {/if}
      {/if}
    </div>
  {/if}
</div>
