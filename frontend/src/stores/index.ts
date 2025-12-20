import { writable, derived } from 'svelte/store';
import type { Project, Stats, SpecSummary, ChangeSummary } from '../lib/api';
import { getProject, getStats, getSpecs, getChanges } from '../lib/api';
import { wsClient, type WSMessage } from '../lib/websocket';

// Loading states
export const isLoading = writable(true);
export const error = writable<string | null>(null);

// Data stores
export const project = writable<Project | null>(null);
export const stats = writable<Stats | null>(null);
export const specs = writable<SpecSummary[]>([]);
export const activeChanges = writable<ChangeSummary[]>([]);
export const archivedChanges = writable<ChangeSummary[]>([]);

// UI state
export const currentRoute = writable<string>('/');
export const searchQuery = writable('');
export const toasts = writable<{ id: number; message: string; type: 'info' | 'success' | 'error' }[]>([]);

// Refresh triggers - increment to signal components to reload their data
export const specsRefreshTrigger = writable(0);
export const changesRefreshTrigger = writable(0);

let toastId = 0;

export function addToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const id = ++toastId;
  toasts.update((t) => [...t, { id, message, type }]);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toasts.update((t) => t.filter((toast) => toast.id !== id));
  }, 3000);
}

// Initialize data
export async function initializeData() {
  isLoading.set(true);
  error.set(null);

  try {
    const [projectData, statsData, specsData, changesData] = await Promise.all([
      getProject(),
      getStats(),
      getSpecs(),
      getChanges(),
    ]);

    project.set(projectData);
    stats.set(statsData);
    specs.set(specsData);
    activeChanges.set(changesData.active);
    archivedChanges.set(changesData.archived);
  } catch (e) {
    error.set(e instanceof Error ? e.message : 'Failed to load data');
  } finally {
    isLoading.set(false);
  }
}

// Handle WebSocket updates
export function setupWebSocket() {
  wsClient.connect();

  return wsClient.subscribe(async (message: WSMessage) => {
    if (message.type === 'data:refresh') {
      const entity = message.entity;

      if (entity === 'all' || entity === 'project') {
        const projectData = await getProject();
        project.set(projectData);
      }

      if (entity === 'all' || entity === 'specs') {
        const specsData = await getSpecs();
        specs.set(specsData);
        specsRefreshTrigger.update((n) => n + 1);
      }

      if (entity === 'all' || entity === 'changes') {
        const changesData = await getChanges();
        activeChanges.set(changesData.active);
        archivedChanges.set(changesData.archived);
        changesRefreshTrigger.update((n) => n + 1);
      }

      // Always refresh stats
      const statsData = await getStats();
      stats.set(statsData);

      // Show toast notification
      if (entity !== 'all') {
        const entityName = message.entityId || entity;
        addToast(`Updated: ${entityName}`, 'info');
      }
    }
  });
}

// Simple routing
export function navigateTo(path: string) {
  currentRoute.set(path);
  window.history.pushState({}, '', path);
}

// Handle browser back/forward
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    currentRoute.set(window.location.pathname);
  });
}
