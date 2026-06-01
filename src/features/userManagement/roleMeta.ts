import type { UserRole } from '@shared/config/navigationTypes';
import i18n from '@/i18n';

/**
 * Role display names for UI — resolved via i18n.
 * Use `getRoleDisplayName(role)` for reactive components; these functions
 * are safe to call outside React (e.g., in formatters).
 */
export const getRoleDisplayName = (role: UserRole): string =>
  i18n.t(`userManagement:roles.displayNames.${role}`, { defaultValue: role });

export const getRoleDescription = (role: UserRole): string =>
  i18n.t(`userManagement:roles.descriptions.${role}`, { defaultValue: '' });

/**
 * All available roles in display order.
 */
export const allRoles: UserRole[] = [
  'Admin',
  'IntAdmin',
  'ExtAdmin',
  'RM',
  'RequestMaker',
  'RequestChecker',
  'IntAppraisalStaff',
  'IntAppraisalChecker',
  'IntAppraisalVerifier',
  'ExtAppraisalStaff',
  'ExtAppraisalChecker',
  'ExtAppraisalVerifier',
  'AppraisalCommittee',
  'MeetingSecretary',
];
