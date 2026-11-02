<script lang="ts">
  import { onMount } from 'svelte';
  import { getProjects, type ProjectOverview } from '../lib/api';

  let data: ProjectOverview | null = null;
  let loading = true;
  let error = '';
  let filter = '';
  let lastScanned = '';

  $: visibleProjects = (data?.projects || []).filter((project) =>
    `${project.name} ${project.relativePath}`.toLowerCase().includes(filter.toLowerCase())
  );

  async function loadProjects(forceRefresh = false) {
    loading = true;
    error = '';
    try {
      data = await getProjects(forceRefresh);
      lastScanned = new Date(data.scannedAt).toLocaleTimeString();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Project discovery failed';
    } finally {
      loading = false;
    }
  }

  onMount(() => { void loadProjects(); });
</script>

<section class="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-6 mb-6">
  <div class="flex flex-wrap justify-between items-start gap-4">
    <div>
      <p class="text-xs font-semibold tracking-widest uppercase text-blue-400 mb-2">OpenSpec Viewer / Workspace</p>
      <h1 class="text-3xl font-bold text-gray-100">Your projects, in one place</h1>
      <p class="text-gray-400 mt-2">Explore the folders using OpenSpec, then pick up where you left off.</p>
    </div>
    <button
      onclick={() => loadProjects(true)}
      disabled={loading}
      class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
    >
      <svg class="w-4 h-4" class:animate-spin={loading} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7v5h-5M4 17v-5h5m-3-4a7 7 0 0112-2l2 2M4 16l2 2a7 7 0 0012-2" />
      </svg>
      {loading ? 'Scanning folders...' : 'Refresh projects'}
    </button>
  </div>
  {#if data}
    <div class="mt-6 pt-4 border-t border-gray-700 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p class="text-gray-400 break-all"><span class="text-gray-500">Workspace root</span> <code class="ml-2 text-gray-200">{data.root}</code></p>
      <p class="text-gray-400"><span class="font-semibold text-blue-300">{data.projects.length}</span> projects found <span class="ml-3 text-gray-500">Scanned {lastScanned}</span></p>
    </div>
  {/if}
</section>

{#if error}
  <p class="mb-4 p-4 bg-red-900/50 text-red-300 rounded" role="alert">{error}</p>
{/if}

{#if loading && !data}
  <div class="p-8 text-center border border-dashed border-gray-700 rounded-xl" role="status">
    <p class="text-gray-300">Searching workspace for OpenSpec projects...</p>
    <p class="text-sm text-gray-500 mt-2">Nested folders are included. Dependencies, build output, caches, and directory links are skipped.</p>
  </div>
{:else if data}
  {#if loading}
    <p class="mb-4 text-sm text-gray-400" role="status">Refreshing projects; previous results remain visible.</p>
  {/if}
  {#if data.warnings.length}
    <details class="mb-6 p-4 bg-yellow-900/30 text-yellow-200 rounded">
      <summary>{data.warnings.length} location(s) could not be scanned</summary>
      <ul class="mt-2 text-sm space-y-1">
        {#each data.warnings as warning}<li class="break-all">{warning}</li>{/each}
      </ul>
    </details>
  {/if}
  {#if data.projects.length === 0}
    <div class="p-8 border border-dashed border-gray-700 rounded-xl text-center">
      <h2 class="text-lg text-gray-200 font-semibold">No OpenSpec projects yet</h2>
      <p class="text-gray-400 mt-2">Look for an openspec directory containing specs, changes, or config.yaml.</p>
      <p class="text-sm text-gray-500 mt-2">After adding a project under this workspace, click Refresh projects.</p>
    </div>
  {:else}
    <div class="flex flex-wrap justify-between items-center gap-3 mb-4">
      <h2 class="text-lg font-semibold text-gray-200">Project folders <span class="text-sm font-normal text-gray-500">({visibleProjects.length})</span></h2>
      <input
        type="search"
        bind:value={filter}
        aria-label="Filter projects by name or folder"
        placeholder="Filter by name or folder..."
        class="w-full sm:w-72 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each visibleProjects as project (project.id)}
        <a
          href="/dashboard?project={encodeURIComponent(project.id)}"
          class="group block p-5 bg-gray-800 border border-gray-700 rounded-xl hover:border-blue-500 hover:bg-gray-800/80 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          <div class="flex items-center justify-between mb-4">
            <div class="p-2 rounded-lg bg-blue-900/40 text-blue-400">
              <svg class="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <span class="text-xs text-green-300 bg-green-900/30 border border-green-800 rounded-full px-2 py-1">OpenSpec</span>
          </div>
          <h3 class="text-lg font-semibold text-gray-100 group-hover:text-blue-300">{project.name}</h3>
          <div class="mt-3 pl-3 border-l border-gray-600 text-xs font-mono space-y-1">
            {#each project.relativePath.split(/[\\/]/) as segment, index}
              <p class="break-all" class:text-blue-400={segment === 'openspec'} class:text-gray-400={segment !== 'openspec'} style:padding-left="{Math.min(index, 4) * 8}px">
                {segment}
              </p>
            {/each}
          </div>
          <p class="mt-5 text-sm text-blue-400">Open project <span aria-hidden="true">&rarr;</span></p>
        </a>
      {/each}
    </div>
    {#if visibleProjects.length === 0}
      <p class="p-8 text-center text-gray-400">No projects match this filter.</p>
    {/if}
  {/if}
{/if}
