<script lang="ts">
  import { onMount } from 'svelte';
  import {
    initializeData,
    setupWebSocket,
    currentRoute,
    isLoading,
    error,
    project,
    toasts,
    navigateTo,
  } from './stores/index';
  import Navigation from './components/Navigation.svelte';
  import Dashboard from './components/Dashboard.svelte';
  import SpecsList from './components/SpecsList.svelte';
  import SpecViewer from './components/SpecViewer.svelte';
  import ChangesList from './components/ChangesList.svelte';
  import ChangeViewer from './components/ChangeViewer.svelte';
  import Toast from './components/Toast.svelte';

  onMount(() => {
    // Set initial route from URL
    currentRoute.set(window.location.pathname);

    // Initialize data and WebSocket
    initializeData();
    const unsubscribe = setupWebSocket();

    return () => {
      unsubscribe();
    };
  });

  // Parse route to get component and params
  function parseRoute(route: string): { component: string; param?: string } {
    if (route === '/' || route === '') {
      return { component: 'dashboard' };
    }
    if (route === '/specs') {
      return { component: 'specs-list' };
    }
    if (route.startsWith('/specs/')) {
      return { component: 'spec-viewer', param: decodeURIComponent(route.slice(7)) };
    }
    if (route === '/changes') {
      return { component: 'changes-list' };
    }
    if (route.startsWith('/changes/')) {
      return { component: 'change-viewer', param: decodeURIComponent(route.slice(9)) };
    }
    return { component: 'dashboard' };
  }

  $: routeInfo = parseRoute($currentRoute);
</script>

<div class="min-h-screen bg-gray-900">
  <Navigation projectName={$project?.name || 'OpenSpec Viewer'} />

  <main class="max-w-7xl mx-auto px-4 py-6">
    {#if $isLoading}
      <div class="flex items-center justify-center h-64">
        <div class="text-gray-400">Loading...</div>
      </div>
    {:else if $error}
      <div class="bg-red-900/50 border border-red-700 rounded-lg p-4">
        <h2 class="text-red-400 font-semibold">Error</h2>
        <p class="text-red-300">{$error}</p>
        <button
          class="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onclick={() => initializeData()}
        >
          Retry
        </button>
      </div>
    {:else if routeInfo.component === 'dashboard'}
      <Dashboard />
    {:else if routeInfo.component === 'specs-list'}
      <SpecsList />
    {:else if routeInfo.component === 'spec-viewer' && routeInfo.param}
      <SpecViewer specName={routeInfo.param} />
    {:else if routeInfo.component === 'changes-list'}
      <ChangesList />
    {:else if routeInfo.component === 'change-viewer' && routeInfo.param}
      <ChangeViewer changeName={routeInfo.param} />
    {:else}
      <Dashboard />
    {/if}
  </main>

  <!-- Toast notifications -->
  <div class="fixed bottom-4 right-4 space-y-2">
    {#each $toasts as toast (toast.id)}
      <Toast message={toast.message} type={toast.type} />
    {/each}
  </div>
</div>
