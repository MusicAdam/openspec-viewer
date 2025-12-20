<script lang="ts">
  import { onMount } from 'svelte';
  import { getSpec, type Spec } from '../lib/api';
  import { navigateTo, specsRefreshTrigger } from '../stores/index';
  import MarkdownRenderer from './MarkdownRenderer.svelte';

  export let specName: string;

  let spec: Spec | null = null;
  let loading = true;
  let error: string | null = null;
  let activeTab: 'spec' | 'design' = 'spec';
  let lastRefreshTrigger = 0;

  onMount(async () => {
    await loadSpec();
    lastRefreshTrigger = $specsRefreshTrigger;
  });

  // React to WebSocket refresh signals
  $: if ($specsRefreshTrigger > lastRefreshTrigger) {
    lastRefreshTrigger = $specsRefreshTrigger;
    loadSpec();
  }

  async function loadSpec() {
    loading = true;
    error = null;
    try {
      spec = await getSpec(specName);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load spec';
    } finally {
      loading = false;
    }
  }

  $: if (specName) loadSpec();
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <button
      class="p-2 hover:bg-gray-700 rounded-lg"
      onclick={() => navigateTo('/specs')}
    >
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <div>
      <h1 class="text-2xl font-bold text-gray-100">{specName}</h1>
      <p class="text-gray-400">Specification</p>
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
  {:else if spec}
    <!-- Tabs -->
    {#if spec.designContent}
      <div class="border-b border-gray-700">
        <nav class="flex space-x-4">
          <button
            class="px-4 py-2 border-b-2 font-medium text-sm transition-colors {activeTab === 'spec'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'}"
            onclick={() => (activeTab = 'spec')}
          >
            Specification
          </button>
          <button
            class="px-4 py-2 border-b-2 font-medium text-sm transition-colors {activeTab === 'design'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'}"
            onclick={() => (activeTab = 'design')}
          >
            Design
          </button>
        </nav>
      </div>
    {/if}

    <!-- Content -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      {#if activeTab === 'spec'}
        <MarkdownRenderer content={spec.specContent} />
      {:else if spec.designContent}
        <MarkdownRenderer content={spec.designContent} />
      {/if}
    </div>
  {/if}
</div>
