/**
 * Activity menu overrides are restrict-only: role permissions are the ceiling and
 * an override can only HIDE an item or force it READ-ONLY — never grant. The wire
 * contract is two booleans (isVisible, canEdit); this module maps them onto a single
 * mutually-exclusive "access" choice the admin actually reasons about.
 *
 *   inherit  → (isVisible:true,  canEdit:true)   no restriction; the role decides
 *   readonly → (isVisible:true,  canEdit:false)  visible but locked for this task
 *   hidden   → (isVisible:false, canEdit:false)  removed for this task
 */
export type OverrideAccess = 'inherit' | 'readonly' | 'hidden';

export function accessFromRow(r: { isVisible: boolean; canEdit: boolean }): OverrideAccess {
  if (!r.isVisible) return 'hidden';
  return r.canEdit ? 'inherit' : 'readonly';
}

export function rowFromAccess(a: OverrideAccess): { isVisible: boolean; canEdit: boolean } {
  switch (a) {
    case 'hidden':
      return { isVisible: false, canEdit: false };
    case 'readonly':
      return { isVisible: true, canEdit: false };
    default:
      return { isVisible: true, canEdit: true };
  }
}

/**
 * The state a user actually experiences = role base ∩ override.
 * `noRoleAccess` means the role can't even view the item, so the override is moot.
 */
export type EffectiveState = 'editable' | 'readonly' | 'hidden' | 'noRoleAccess';

export function effectiveWithRole(
  access: OverrideAccess,
  roleCanView: boolean,
  roleCanEdit: boolean,
): EffectiveState {
  if (!roleCanView) return 'noRoleAccess';
  if (access === 'hidden') return 'hidden';
  if (access === 'readonly') return 'readonly';
  // inherit → role decides editability
  return roleCanEdit ? 'editable' : 'readonly';
}

/** Effect when no role is chosen — show the override's own intent (role assumed permissive). */
export function effectiveIntent(access: OverrideAccess): EffectiveState {
  if (access === 'hidden') return 'hidden';
  if (access === 'readonly') return 'readonly';
  return 'editable';
}
