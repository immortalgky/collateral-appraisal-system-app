import { create } from 'zustand';
import type { PropertyClipboardStore, PropertyItem } from './types';

/**
 * Clipboard-only store for property copy/paste operations.
 * All CRUD operations have been moved to React Query hooks
 * in api/propertyGroup.ts and hooks/useEnrichedPropertyGroups.ts.
 */
export const usePropertyClipboardStore = create<PropertyClipboardStore>(set => ({
  clipboard: null,

  copyProperty: (property: PropertyItem) =>
    set(() => ({
      clipboard: property,
    })),

  clearClipboard: () =>
    set(() => ({
      clipboard: null,
    })),
}));
