import type { NavContext } from './navigationTypes';

export type AppraisalMenuCondition = {
  /** Return false to hide the menu item for the given context */
  showWhen?: (ctx: NavContext) => boolean;
  /** Return true to force canEdit = false regardless of backend value */
  forceReadOnly?: (ctx: NavContext) => boolean;
};

/**
 * Code-side conditions keyed by the seeded ItemKey values.
 * These mirror the showWhen / editableRoles logic that was previously
 * hardcoded in appraisalNavigation.ts.
 *
 * Only items that have conditional visibility or forced read-only need an
 * entry here. Items with no entry are always shown with their backend-provided
 * canEdit value.
 */
export const appraisalMenuConditions: Record<string, AppraisalMenuCondition> = {
  // Property Information — standard (non-PMA, non-block-condo). Legacy showWhen preserved.
  'appraisal.property': {
    showWhen: ctx => !ctx.isPma && !ctx.isBlockCondo,
  },
  // Property Information (PMA variant) — legacy showWhen preserved.
  'appraisal.property-pma': {
    showWhen: ctx => ctx.isPma === true,
  },
  // Note: appraisal.block-condo and appraisal.block-village had NO showWhen predicate
  // in the legacy navigation (always visible to viewers with the role). Do not add a
  // visibility predicate here without explicit design intent — a previous implementation
  // incorrectly gated both on ctx.isBlockCondo which narrowed visibility and keyed the
  // village variant on the wrong flag.

  // 360 Summary — always visible (no condition); editableRoles was empty = read-only
  'appraisal.360': {
    forceReadOnly: () => true,
  },
  // Request Information — always read-only in appraisal context
  'appraisal.request': {
    forceReadOnly: () => true,
  },
};
