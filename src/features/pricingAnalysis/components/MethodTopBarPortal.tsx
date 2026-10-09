import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  MethodTopBarPortalCtx,
  type MethodTopBarSlots,
} from '../store/methodTopBarPortalContext';

/**
 * Renders `children` into one of the top-bar slots owned by `PricingAnalysisPage`, once
 * that slot has mounted. Used by the active method panel to contribute its template chip
 * (`slot="chip"`, left, beside the method name) and its value figure plus
 * cancel/reset/save actions (default `slot="actions"`, right end of the bar).
 *
 * Renders nothing (not even the children) until the slot is available, so callers can
 * mount this unconditionally alongside their own in-body content.
 */
export function MethodTopBarPortal({
  children,
  slot = 'actions',
}: {
  children: ReactNode;
  slot?: keyof MethodTopBarSlots;
}) {
  const slots = useContext(MethodTopBarPortalCtx);
  const target = slots?.[slot];
  if (!target) return null;
  return createPortal(children, target);
}
