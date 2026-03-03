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
      update((state) => ({
        ...state,
        isActive: true,
        currentChange: changeName,
        suggestions: [],
        selectedBlockId: null,
        popoverPosition: null,
      }));
    },

    exitSuggestionMode() {
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
      update((state) => ({
        ...state,
        suggestions: [
          ...state.suggestions,
          { id, blockId, originalText, suggestedChange },
        ],
        selectedBlockId: null,
        popoverPosition: null,
      }));
    },

    updateSuggestion(id: string, suggestedChange: string) {
      update((state) => ({
        ...state,
        suggestions: state.suggestions.map((s) =>
          s.id === id ? { ...s, suggestedChange } : s
        ),
      }));
    },

    removeSuggestion(id: string) {
      update((state) => ({
        ...state,
        suggestions: state.suggestions.filter((s) => s.id !== id),
      }));
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
