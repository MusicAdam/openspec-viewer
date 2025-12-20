<script lang="ts">
  import { specs, navigateTo } from '../stores/index';
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-100">Specifications</h1>
    <p class="text-gray-400 mt-1">Current truth - what IS built</p>
  </div>

  <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
    <div class="divide-y divide-gray-700">
      {#if $specs.length === 0}
        <div class="px-6 py-8 text-center text-gray-400">
          No specifications found
        </div>
      {:else}
        {#each $specs as spec}
          <button
            class="w-full px-6 py-4 hover:bg-gray-700/50 text-left flex items-center justify-between"
            onclick={() => navigateTo(`/specs/${spec.name}`)}
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-green-900 flex items-center justify-center">
                <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div class="font-medium text-gray-100">{spec.name}</div>
                <div class="text-sm text-gray-400">
                  {spec.hasDesign ? 'spec + design' : 'spec only'}
                </div>
              </div>
            </div>
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>
