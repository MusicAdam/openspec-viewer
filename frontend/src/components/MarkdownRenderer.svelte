<script lang="ts">
  import { renderMarkdown, highlightDeltas } from '../lib/markdown';

  export let content: string;
  export let highlightDiff: boolean = false;

  $: html = highlightDiff ? highlightDeltas(renderMarkdown(content)) : renderMarkdown(content);
</script>

<div class="markdown-body">
  {@html html}
</div>
