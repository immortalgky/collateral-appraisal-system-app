/**
 * Navigation types shared across the application.
 * These are type-only exports — no runtime data (roles, configs, etc.)
 * Runtime navigation data comes from useMenuStore (DB-driven).
 */

export type NavContext = {
  isPma?: boolean;
  isBlockCondo?: boolean;
  status?: string;
};

export type NavItem = {
  itemKey: string;
  name: string;
  href: string;
  icon: string;
  iconStyle: string;
  iconColor?: string;
  children?: NavItem[];
  canView: boolean;
  canEdit: boolean;
};

/**
 * NavItemWithAccess is an alias for NavItem — canView/canEdit are always present.
 */
export type NavItemWithAccess = NavItem;

/** Statuses that make all appraisal menu items read-only (canEdit = false). */
export const TERMINAL_STATUSES: string[] = ['completed', 'approved', 'rejected', 'cancelled'];

export function isTerminalStatus(status: string | undefined): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.some(s => s.toLowerCase() === status.toLowerCase());
}

/**
 * Legacy UserRole type preserved for auth and component consumers
 * that still need to reference the role union.
 */
export type UserRole =
  | 'Admin'
  | 'IntAdmin'
  | 'ExtAdmin'
  | 'RequestMaker'
  | 'RequestChecker'
  | 'IntAppraisalStaff'
  | 'IntAppraisalChecker'
  | 'IntAppraisalVerifier'
  | 'ExtAppraisalStaff'
  | 'ExtAppraisalChecker'
  | 'ExtAppraisalVerifier'
  | 'AppraisalCommittee'
  | 'MeetingSecretary';
