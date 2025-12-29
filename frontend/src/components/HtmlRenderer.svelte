<script lang="ts">
  export let src: string;
  export let title: string = 'HTML Preview';

  let iframeHeight = 600;
  let iframe: HTMLIFrameElement;

  function handleLoad() {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        iframeHeight = Math.max(doc.body.scrollHeight + 40, 400);
      }
    } catch (e) {
      // Cross-origin, use default height
    }
  }
</script>

<div class="html-preview rounded-lg overflow-hidden border border-gray-600">
  <div class="bg-gray-700 px-4 py-2 flex items-center justify-between">
    <span class="text-sm text-gray-300">{title}</span>
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      class="text-sm text-blue-400 hover:text-blue-300"
    >
      Open in new tab
    </a>
  </div>
  <iframe
    bind:this={iframe}
    {src}
    title={title}
    sandbox="allow-scripts allow-same-origin"
    class="w-full bg-white"
    style="height: {iframeHeight}px; min-height: 400px; max-height: 80vh;"
    onload={handleLoad}
  ></iframe>
</div>

<style>
  .html-preview {
    background: #1f2937;
  }
</style>
