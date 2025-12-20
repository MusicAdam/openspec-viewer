<script lang="ts">
  import type { TaskProgress } from '../lib/api';

  export let progress: TaskProgress;
  export let size: 'sm' | 'md' = 'md';
  export let showLabel: boolean = false;

  $: percentage = progress.percentage;
  $: color =
    percentage === 100
      ? 'bg-green-500'
      : percentage > 50
        ? 'bg-blue-500'
        : percentage > 0
          ? 'bg-yellow-500'
          : 'bg-gray-600';
</script>

<div class="w-full">
  <div class="flex items-center gap-2">
    <div
      class="flex-1 bg-gray-700 rounded-full overflow-hidden {size === 'sm' ? 'h-2' : 'h-3'}"
    >
      <div
        class="h-full rounded-full transition-all duration-300 {color}"
        style="width: {percentage}%"
      ></div>
    </div>
    <span class="text-sm text-gray-400 whitespace-nowrap {size === 'sm' ? 'text-xs' : ''}">
      {progress.done}/{progress.total}
    </span>
  </div>
  {#if showLabel}
    <div class="text-sm text-gray-400 mt-1">
      {percentage}% complete
    </div>
  {/if}
</div>
