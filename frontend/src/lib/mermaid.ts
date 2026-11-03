import { tick } from 'svelte';

type Mermaid = typeof import('mermaid')['default'];
let engine: Promise<Mermaid> | null = null;
let nextDiagramId = 0;
const maxTextSize = 50_000;

function loadMermaid(): Promise<Mermaid> {
  if (!engine) {
    engine = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'dark',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        htmlLabels: false,
        flowchart: { htmlLabels: false },
        maxTextSize,
        maxEdges: 500,
        suppressErrorRendering: true,
        secure: [
          'secure', 'securityLevel', 'startOnLoad', 'maxTextSize', 'maxEdges',
          'suppressErrorRendering', 'htmlLabels', 'flowchart', 'themeCSS',
        ],
      });
      return mermaid;
    }).catch((error) => {
      engine = null;
      throw error;
    });
  }
  return engine;
}

function showError(container: HTMLElement, error: unknown) {
  const message = document.createElement('p');
  message.className = 'mermaid-error';
  message.setAttribute('role', 'alert');
  message.textContent = error instanceof Error ? error.message : String(error);
  container.append(message);
}

function addControls(frame: HTMLElement, canvas: HTMLElement, svg: SVGSVGElement, signal: AbortSignal) {
  const controls = document.createElement('div');
  controls.className = 'mermaid-controls';
  controls.dataset.diagramControl = '';
  frame.prepend(controls);
  let zoom = 1;
  const naturalWidth = svg.viewBox.baseVal.width;

  function button(label: string, action: () => void) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.addEventListener('click', action, { signal });
    controls.append(element);
    return element;
  }

  function setZoom(value: number) {
    zoom = Math.min(4, Math.max(0.25, value));
    canvas.style.width = `${zoom * 100}%`;
    svg.style.maxWidth = `${naturalWidth * zoom}px`;
    zoomIn.disabled = zoom >= 4;
    zoomOut.disabled = zoom <= 0.25;
  }
  const zoomIn = button('Zoom in', () => setZoom(zoom * 1.25));
  const zoomOut = button('Zoom out', () => setZoom(zoom / 1.25));
  button('Fit', () => setZoom(1));

  if (document.fullscreenEnabled) {
    const fullscreen = button('Full screen', () => {
      const request = document.fullscreenElement === frame
        ? document.exitFullscreen()
        : frame.requestFullscreen();
      void request.catch((error) => showError(frame, error));
    });
    document.addEventListener('fullscreenchange', () => {
      fullscreen.textContent = document.fullscreenElement === frame ? 'Exit full screen' : 'Full screen';
    }, { signal });
  }
}

export function mermaidDiagrams(node: HTMLElement, _html: string) {
  let version = 0;
  let destroyed = false;
  let controller = new AbortController();

  async function render(currentVersion: number) {
    await tick();
    const stale = () => destroyed || currentVersion !== version || !node.isConnected;
    if (stale()) return;
    const signal = controller.signal;
    const diagrams = Array.from(node.querySelectorAll<HTMLElement>('pre[data-mermaid] > code')).map((code) => {
      const pre = code.parentElement!;
      const source = code.textContent || '';
      const frame = document.createElement('div');
      frame.className = 'mermaid-diagram';
      frame.dataset.diagramState = 'loading';
      const viewport = document.createElement('div');
      viewport.className = 'mermaid-viewport';
      const canvas = document.createElement('div');
      canvas.className = 'mermaid-canvas';
      const loading = document.createElement('p');
      loading.setAttribute('role', 'status');
      loading.textContent = 'Rendering Mermaid diagram...';
      canvas.append(loading);
      viewport.append(canvas);
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'View Mermaid source';
      summary.dataset.diagramControl = '';
      details.append(summary);
      pre.replaceWith(frame);
      details.append(pre);
      frame.append(viewport, details);
      return { source, frame, canvas, details };
    });
    if (!diagrams.length) return;

    function fail(diagram: typeof diagrams[number], error: unknown) {
      diagram.canvas.replaceChildren();
      showError(diagram.canvas, new Error(`Could not render Mermaid diagram: ${error instanceof Error ? error.message : String(error)}`));
      diagram.details.open = true;
      diagram.frame.dataset.diagramState = 'error';
    }

    let mermaid: Mermaid;
    try {
      mermaid = await loadMermaid();
    } catch (error) {
      if (!stale()) diagrams.forEach((diagram) => fail(diagram, error));
      return;
    }
    for (const diagram of diagrams) {
      if (stale()) return;
      try {
        if (diagram.source.length > maxTextSize) throw new Error(`Diagram exceeds ${maxTextSize} characters`);
        const { svg } = await mermaid.render(`openspec-mermaid-${++nextDiagramId}`, diagram.source, diagram.canvas);
        if (stale()) return;
        diagram.canvas.innerHTML = svg;
        const graphic = diagram.canvas.querySelector('svg');
        if (!graphic) throw new Error('Renderer returned no SVG diagram');
        addControls(diagram.frame, diagram.canvas, graphic, signal);
        diagram.frame.dataset.diagramState = 'ready';
      } catch (error) {
        if (stale()) return;
        fail(diagram, error);
      }
    }
  }

  function update() {
    controller.abort();
    controller = new AbortController();
    void render(++version);
  }
  update();
  return {
    update,
    destroy() {
      destroyed = true;
      controller.abort();
    },
  };
}
