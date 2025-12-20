<script lang="ts">
  import { stats, activeChanges, project, navigateTo } from '../stores/index';
  import TaskProgress from './TaskProgress.svelte';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
</script>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h1 class="text-2xl font-bold text-gray-100">Dashboard</h1>
    {#if $project?.description}
      <p class="text-gray-400 mt-1">{$project.description}</p>
    {/if}
  </div>

  <!-- Stats Cards -->
  {#if $stats}
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <div class="text-sm font-medium text-gray-400">Total Specs</div>
        <div class="text-3xl font-bold text-gray-100 mt-1">{$stats.totalSpecs}</div>
      </div>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <div class="text-sm font-medium text-gray-400">Active Changes</div>
        <div class="text-3xl font-bold text-blue-400 mt-1">{$stats.activeChanges}</div>
      </div>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <div class="text-sm font-medium text-gray-400">Archived Changes</div>
        <div class="text-3xl font-bold text-gray-100 mt-1">{$stats.archivedChanges}</div>
      </div>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <div class="text-sm font-medium text-gray-400">Overall Progress</div>
        <div class="mt-2">
          <TaskProgress progress={$stats.overallTaskProgress} showLabel={true} />
        </div>
      </div>
    </div>
  {/if}

  <!-- Active Changes -->
  <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
    <div class="px-6 py-4 border-b border-gray-700">
      <h2 class="text-lg font-semibold text-gray-100">Active Changes</h2>
    </div>
    <div class="divide-y divide-gray-700">
      {#if $activeChanges.length === 0}
        <div class="px-6 py-8 text-center text-gray-400">
          No active changes
        </div>
      {:else}
        {#each $activeChanges as change}
          <button
            class="w-full px-6 py-4 hover:bg-gray-700/50 text-left flex items-center justify-between"
            onclick={() => navigateTo(`/changes/${change.name}`)}
          >
            <div>
              <div class="font-medium text-gray-100">{change.name}</div>
              <div class="text-sm text-gray-400 mt-1">
                {change.specDeltaCount} spec delta{change.specDeltaCount !== 1 ? 's' : ''}
                {#if change.hasDesign}
                  <span class="ml-2 px-1.5 py-0.5 text-xs bg-purple-900 text-purple-300 rounded">design</span>
                {/if}
              </div>
            </div>
            <div class="w-32">
              <TaskProgress progress={change.taskProgress} size="sm" />
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Project Info -->
  {#if $project?.content}
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      <div class="px-6 py-4 border-b border-gray-700">
        <h2 class="text-lg font-semibold text-gray-100">Project Documentation</h2>
      </div>
      <div class="px-6 py-4">
        <MarkdownRenderer content={$project.content} />
      </div>
    </div>
  {/if}
</div>
