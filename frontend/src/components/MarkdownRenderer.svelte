<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { renderMarkdown, renderMarkdownWithBlocks, highlightDeltas } from '../lib/markdown';
  import { suggestionStore, blockSuggestionMap } from '../stores/suggestions';

  export let content: string;
  export let highlightDiff: boolean = false;
  export let suggestionModeEnabled: boolean = false;

  let containerElement: HTMLDivElement;

  $: baseHtml = suggestionModeEnabled
    ? renderMarkdownWithBlocks(content)
    : renderMarkdown(content);
  $: html = highlightDiff ? highlightDeltas(baseHtml) : baseHtml;

  // Track which blocks have suggestions
  $: suggestionMap = $blockSuggestionMap;
  $: selectedBlockId = $suggestionStore.selectedBlockId;

  function handleBlockClick(event: MouseEvent) {
    if (!suggestionModeEnabled) return;

    // Find the clicked block
    const target = event.target as HTMLElement;
    const block = target.closest('.suggestion-block') as HTMLElement | null;

    if (block) {
      event.preventDefault();
      event.stopPropagation();

      const blockId = block.getAttribute('data-block-id');
      if (blockId) {
        const rect = block.getBoundingClientRect();
        suggestionStore.selectBlock(blockId, {
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8,
        });
      }
    }
  }

  function updateBlockClasses() {
    if (!containerElement) return;

    const blocks = containerElement.querySelectorAll('.suggestion-block');
    blocks.forEach((block) => {
      const blockId = block.getAttribute('data-block-id');
      if (!blockId) return;

      // Update selected state
      if (blockId === selectedBlockId) {
        block.classList.add('selected');
      } else {
        block.classList.remove('selected');
      }

      // Update has-suggestion state
      if (suggestionMap.has(blockId)) {
        block.classList.add('has-suggestion');
      } else {
        block.classList.remove('has-suggestion');
      }
    });
  }

  // Update classes when state changes
  $: if (containerElement && suggestionModeEnabled) {
    // Run on next tick to ensure DOM is updated
    setTimeout(updateBlockClasses, 0);
  }

  // Also update when selected block or suggestions change
  $: selectedBlockId, suggestionMap, updateBlockClasses();
</script>

<div
  class="markdown-body"
  class:suggestion-mode={suggestionModeEnabled}
  bind:this={containerElement}
  onclick={handleBlockClick}
  role={suggestionModeEnabled ? "application" : undefined}
  aria-label={suggestionModeEnabled ? "Click on a text block to add a suggestion" : undefined}
>
  {@html html}
</div>
