import React, { createContext, useContext } from 'react';
import type { SelectionAction, SelectionState } from './selectionReducer';
import type { PricingServerData } from '../types/selection';

export const StateCtx = createContext<SelectionState | null>(null);
export const DispatchCtx = createContext<React.Dispatch<SelectionAction> | null>(null);
export const ServerDataCtx = createContext<PricingServerData | null>(null);

export function useSelectionState() {
  const v = useContext(StateCtx);
  if (!v) throw new Error('useSelectionState must be used within SelectionProvider');
  return v;
}

export function useSelectionDispatch() {
  const v = useContext(DispatchCtx);
  if (!v) throw new Error('useSelectionDispatch must be used within SelectionProvider');
  return v;
}

export function useServerData() {
  const v = useContext(ServerDataCtx);
  if (!v) throw new Error('useServerData must be used within ServerDataProvider');
  return v;
}
