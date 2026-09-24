import { createContext, useContext } from 'react';

/**
 * Owned by ConstructionEditorSection, which the page keys by property: one scope per property on
 * screen. The page and its form outlive a switch to another building, so work that finishes after
 * an await (copy-from, uploads) asks the scope whether its property is still the one on screen
 * before writing into the form. Switching method stays inside the scope, so an upload started in
 * the summary form still attaches after a round trip to the grid.
 */
export interface ConstructionScope {
  /** False once the property this scope was opened for has left the screen. */
  isActive: () => boolean;
  /** An upload is running for this property — kept here so a method switch cannot forget it. */
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
}

export const ConstructionScopeContext = createContext<ConstructionScope>({
  isActive: () => true,
  uploading: false,
  setUploading: () => {},
});

export const useConstructionScope = () => useContext(ConstructionScopeContext);
