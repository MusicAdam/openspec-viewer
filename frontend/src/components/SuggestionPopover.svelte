<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { suggestionStore, blockSuggestionMap } from '../stores/suggestions';

  let textareaElement: HTMLTextAreaElement;
  let suggestionText = '';
  let popoverElement: HTMLDivElement;

  $: position = $suggestionStore.popoverPosition;
  $: selectedBlockId = $suggestionStore.selectedBlockId;
  $: existingSuggestion = selectedBlockId ? $blockSuggestionMap.get(selectedBlockId) : undefined;

  // Get the original text from the DOM
  $: originalText = getOriginalText(selectedBlockId);

  function getOriginalText(blockId: string | null): string {
    if (!blockId) return '';
    const block = document.querySelector(`[data-block-id="${blockId}"]`);
    return block?.getAttribute('data-block-text') || block?.textContent?.trim() || '';
  }

  function truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  function handleAdd() {
    if (!selectedBlockId || !suggestionText.trim()) return;

    if (existingSuggestion) {
      suggestionStore.updateSuggestion(existingSuggestion.id, suggestionText.trim());
    } else {
      suggestionStore.addSuggestion(selectedBlockId, originalText, suggestionText.trim());
    }
    suggestionText = '';
  }

  function handleCancel() {
    suggestionStore.clearSelection();
    suggestionText = '';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    } else if (event.key === 'Enter' && event.metaKey) {
      handleAdd();
    }
  }

  // Focus textarea when popover opens
  $: if (selectedBlockId && textareaElement) {
    tick().then(() => {
      textareaElement?.focus();
      // Pre-fill with existing suggestion if editing
      if (existingSuggestion) {
        suggestionText = existingSuggestion.suggestedChange;
      }
    });
  }

  // Close on click outside
  function handleClickOutside(event: MouseEvent) {
    if (!popoverElement) return;
    if (!popoverElement.contains(event.target as Node)) {
      // Don't close if clicking on a suggestion block (let block selection handle it)
      const target = event.target as HTMLElement;
      if (!target.closest('.suggestion-block')) {
        handleCancel();
      }
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside, true);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside, true);
  });
</script>

{#if selectedBlockId && position}
  <div
    bind:this={popoverElement}
    class="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 w-96"
    style="left: {Math.max(16, Math.min(position.x - 192, window.innerWidth - 400))}px; top: {Math.min(position.y, window.innerHeight - 300)}px;"
    onkeydown={handleKeydown}
    role="dialog"
    aria-labelledby="suggestion-dialog-title"
    tabindex="-1"
  >
    <!-- Original text preview -->
    <div class="mb-3">
      <span id="suggestion-dialog-title" class="block text-xs font-medium text-gray-400 mb-1">Original text:</span>
      <div class="text-sm text-gray-300 bg-gray-900/50 rounded p-2 max-h-24 overflow-y-auto">
        {truncateText(originalText, 200)}
      </div>
    </div>

    <!-- Suggestion input -->
    <div class="mb-3">
      <label for="suggestion-input" class="block text-xs font-medium text-gray-400 mb-1">
        Your suggestion:
      </label>
      <textarea
        id="suggestion-input"
        bind:this={textareaElement}
        bind:value={suggestionText}
        class="w-full h-24 bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-gray-100
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
               resize-none"
        placeholder="Describe your suggested change..."
      ></textarea>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2">
      <button
        onclick={handleCancel}
        class="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        Cancel
      </button>
      <button
        onclick={handleAdd}
        disabled={!suggestionText.trim()}
        class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md
               hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
               transition-colors"
      >
        {existingSuggestion ? 'Update' : 'Add'} Suggestion
      </button>
    </div>

    <!-- Keyboard hint -->
    <div class="mt-2 text-xs text-gray-500 text-center">
      Press <kbd class="px-1 py-0.5 bg-gray-700 rounded text-gray-400">Cmd+Enter</kbd> to add,
      <kbd class="px-1 py-0.5 bg-gray-700 rounded text-gray-400">Esc</kbd> to cancel
    </div>
  </div>
{/if}
