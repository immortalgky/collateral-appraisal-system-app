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
  // Property Information — the normal property page. Visibility is activity-scoped via
  // ActivityMenuOverrides (hidden on int-pma-input, where the PMA variant takes over), so no
  // code-side showWhen here. For block appraisals the href is overridden in useNavigation.
  // Block Condo / Village items are collapsed into "Property Information" above — always hide.
  'appraisal.block-condo': {
    showWhen: () => false,
  },
  'appraisal.block-village': {
    showWhen: () => false,
  },

  // 360 Summary — always visible (no condition); editableRoles was empty = read-only
  'appraisal.360': {
    forceReadOnly: () => true,
  },
};
