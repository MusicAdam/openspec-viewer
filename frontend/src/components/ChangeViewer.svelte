<script lang="ts">
  import { onMount } from 'svelte';
  import { getChange, type Change } from '../lib/api';
  import { navigateTo, changesRefreshTrigger } from '../stores/index';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  import TaskProgress from './TaskProgress.svelte';

  export let changeName: string;

  let change: Change | null = null;
  let loading = true;
  let error: string | null = null;
  let activeTab: 'proposal' | 'tasks' | 'design' | 'deltas' = 'proposal';
  let lastRefreshTrigger = 0;

  onMount(async () => {
    await loadChange();
    lastRefreshTrigger = $changesRefreshTrigger;
  });

  // React to WebSocket refresh signals
  $: if ($changesRefreshTrigger > lastRefreshTrigger) {
    lastRefreshTrigger = $changesRefreshTrigger;
    loadChange();
  }

  async function loadChange() {
    loading = true;
    error = null;
    try {
      change = await getChange(changeName);
      // Set initial tab based on available content
      if (!change.proposal && change.tasksRaw) {
        activeTab = 'tasks';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load change';
    } finally {
      loading = false;
    }
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
    <!-- Tabs -->
    <div class="border-b border-gray-700">
      <nav class="flex space-x-4">
        {#if change.proposal}
          <button
            class="px-4 py-2 border-b-2 font-medium text-sm transition-colors {activeTab === 'proposal'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'}"
            onclick={() => (activeTab = 'proposal')}
          >
            Proposal
          </button>
        {/if}
        {#if change.tasksRaw}
          <button
            class="px-4 py-2 border-b-2 font-medium text-sm transition-colors {activeTab === 'tasks'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'}"
            onclick={() => (activeTab = 'tasks')}
          >
            Tasks
            <span class="ml-1 px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">
              {change.taskProgress.done}/{change.taskProgress.total}
            </span>
          </button>
        {/if}
        {#if change.design}
          <button
            class="px-4 py-2 border-b-2 font-medium text-sm transition-colors {activeTab === 'design'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'}"
            onclick={() => (activeTab = 'design')}
          >
            Design
          </button>
        {/if}
        {#if change.specDeltas.length > 0}
          <button
            class="px-4 py-2 border-b-2 font-medium text-sm transition-colors {activeTab === 'deltas'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'}"
            onclick={() => (activeTab = 'deltas')}
          >
            Spec Deltas
            <span class="ml-1 px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">
              {change.specDeltas.length}
            </span>
          </button>
        {/if}
      </nav>
    </div>

    <!-- Content -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      {#if activeTab === 'proposal' && change.proposal}
        <MarkdownRenderer content={change.proposal} />
      {:else if activeTab === 'tasks' && change.tasksRaw}
        <MarkdownRenderer content={change.tasksRaw} />
      {:else if activeTab === 'design' && change.design}
        <MarkdownRenderer content={change.design} />
      {:else if activeTab === 'deltas'}
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
      {/if}
    </div>
  {/if}
</div>
