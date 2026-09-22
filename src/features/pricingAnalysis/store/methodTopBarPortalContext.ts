import { createContext } from 'react';

/**
 * DOM nodes (owned by `PricingAnalysisPage`) that the active method panel (WQS/SAG/DC)
 * portals its top-bar content into. Two of them, because the content no longer belongs
 * in one place: the template chip sits next to the method-name badge on the left, while
 * the value figure and actions stay at the right end of the bar.
 *
 * Save still submits the panel's own `<form>` natively — a portal preserves React
 * context (so RHF/`useFormContext` inside the portaled content keeps working) but NOT
 * DOM form association, so the portaled submit button uses `form={formId}` to point
 * back at the panel's `<form id={formId}>` rather than relying on DOM nesting.
 */
export interface MethodTopBarSlots {
  /** Directly after the method-name badge — the template chip. */
  chip: HTMLDivElement | null;
  /** Right end of the bar — the method's value figure and cancel/reset/save. */
  actions: HTMLDivElement | null;
}

/** `null` until the page mounts; each slot is `null` until that node has mounted. */
export const MethodTopBarPortalCtx = createContext<MethodTopBarSlots | null>(null);
