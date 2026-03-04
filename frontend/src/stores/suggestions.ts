import { writable, derived, get } from 'svelte/store';

export interface Suggestion {
  id: string;
  blockId: string;
  originalText: string;
  suggestedChange: string;
}

export interface SuggestionState {
  isActive: boolean;
  currentChange: string;
  suggestions: Suggestion[];
  selectedBlockId: string | null;
  popoverPosition: { x: number; y: number } | null;
}

const STORAGE_KEY_PREFIX = 'openspec-suggestions-';

function loadSuggestions(changeName: string): Suggestion[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + changeName);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSuggestions(changeName: string, suggestions: Suggestion[]) {
  try {
    if (suggestions.length === 0) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + changeName);
    } else {
      localStorage.setItem(STORAGE_KEY_PREFIX + changeName, JSON.stringify(suggestions));
    }
  } catch {
    // Ignore storage errors
  }
}

function createSuggestionStore() {
  const { subscribe, set, update } = writable<SuggestionState>({
    isActive: false,
    currentChange: '',
    suggestions: [],
    selectedBlockId: null,
    popoverPosition: null,
  });

  return {
    subscribe,

    enterSuggestionMode(changeName: string) {
      const savedSuggestions = loadSuggestions(changeName);
      update((state) => ({
        ...state,
        isActive: true,
        currentChange: changeName,
        suggestions: savedSuggestions,
        selectedBlockId: null,
        popoverPosition: null,
      }));
    },

    exitSuggestionMode() {
      // Save before exiting
      const state = get({ subscribe });
      if (state.currentChange) {
        saveSuggestions(state.currentChange, state.suggestions);
      }
      set({
        isActive: false,
        currentChange: '',
        suggestions: [],
        selectedBlockId: null,
        popoverPosition: null,
      });
    },

    selectBlock(blockId: string, position: { x: number; y: number }) {
      update((state) => ({
        ...state,
        selectedBlockId: blockId,
        popoverPosition: position,
      }));
    },

    clearSelection() {
      update((state) => ({
        ...state,
        selectedBlockId: null,
        popoverPosition: null,
      }));
    },

    addSuggestion(blockId: string, originalText: string, suggestedChange: string) {
      const id = crypto.randomUUID();
      update((state) => {
        const newSuggestions = [
          ...state.suggestions,
          { id, blockId, originalText, suggestedChange },
        ];
        saveSuggestions(state.currentChange, newSuggestions);
        return {
          ...state,
          suggestions: newSuggestions,
          selectedBlockId: null,
          popoverPosition: null,
        };
      });
    },

    updateSuggestion(id: string, suggestedChange: string) {
      update((state) => {
        const newSuggestions = state.suggestions.map((s) =>
          s.id === id ? { ...s, suggestedChange } : s
        );
        saveSuggestions(state.currentChange, newSuggestions);
        return {
          ...state,
          suggestions: newSuggestions,
        };
      });
    },

    removeSuggestion(id: string) {
      update((state) => {
        const newSuggestions = state.suggestions.filter((s) => s.id !== id);
        saveSuggestions(state.currentChange, newSuggestions);
        return {
          ...state,
          suggestions: newSuggestions,
        };
      });
    },

    clearAllSuggestions() {
      update((state) => {
        saveSuggestions(state.currentChange, []);
        return {
          ...state,
          suggestions: [],
        };
      });
    },

    reconcileSuggestions(newContent: string): number {
      let resolvedCount = 0;
      update((state) => {
        const remaining = state.suggestions.filter((s) => {
          const stillExists = newContent.includes(s.originalText);
          if (!stillExists) {
            resolvedCount++;
          }
          return stillExists;
        });

        if (resolvedCount > 0) {
          saveSuggestions(state.currentChange, remaining);
        }

        return { ...state, suggestions: remaining };
      });
      return resolvedCount;
    },

    getSuggestionForBlock(blockId: string): Suggestion | undefined {
      const state = get({ subscribe });
      return state.suggestions.find((s) => s.blockId === blockId);
    },

    hasBlockSuggestion(blockId: string): boolean {
      const state = get({ subscribe });
      return state.suggestions.some((s) => s.blockId === blockId);
    },
  };
}

export const suggestionStore = createSuggestionStore();

// Derived store for easy access to whether a block has suggestions
export const blockSuggestionMap = derived(suggestionStore, ($store) => {
  const map = new Map<string, Suggestion>();
  for (const suggestion of $store.suggestions) {
    map.set(suggestion.blockId, suggestion);
  }
  return map;
});
