import React, { createContext, useContext } from 'react';
import type {
  PriceAnalysisSelectorAction,
  PriceAnalysisSelectorState,
} from '../../domain/useReducer';

export const StateCtx = createContext<PriceAnalysisSelectorState | null>(null);
export const DispatchCtx = createContext<React.Dispatch<PriceAnalysisSelectorAction> | null>(null);

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
