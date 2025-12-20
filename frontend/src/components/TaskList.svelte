<script lang="ts">
  import type { Task } from '../lib/api';

  export let tasks: Task[];
  export let depth: number = 0;
</script>

<ul class="space-y-2 {depth > 0 ? 'ml-6 mt-2' : ''}">
  {#each tasks as task}
    <li>
      <div class="flex items-start gap-2">
        <div class="mt-0.5">
          {#if task.completed}
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          {:else}
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke-width="2" />
            </svg>
          {/if}
        </div>
        <span class="{task.completed ? 'text-gray-500 line-through' : 'text-gray-200'}">
          {task.text}
        </span>
      </div>
      {#if task.subtasks.length > 0}
        <svelte:self tasks={task.subtasks} depth={depth + 1} />
      {/if}
    </li>
  {/each}
</ul>
