import type { UserRole } from '@shared/config/navigationTypes';

/**
 * Role display names for UI.
 * Moved from @shared/config/navigation to here — these are user-management
 * concerns, not navigation concerns.
 */
export const roleDisplayNames: Record<UserRole, string> = {
  Admin: 'System Administrator',
  IntAdmin: 'Workflow Administrator',
  ExtAdmin: 'External Company Administrator',
  RM: 'Relationship Manager',
  RequestMaker: 'Request Maker',
  RequestChecker: 'Request Checker',
  IntAppraisalStaff: 'Internal Appraisal Staff',
  IntAppraisalChecker: 'Internal Appraisal Checker',
  IntAppraisalVerifier: 'Internal Appraisal Verifier',
  ExtAppraisalStaff: 'External Appraisal Staff',
  ExtAppraisalChecker: 'External Appraisal Checker',
  ExtAppraisalVerifier: 'External Appraisal Verifier',
  AppraisalCommittee: 'Appraisal Committee Member',
  MeetingSecretary: 'Meeting Secretary',
};

/**
 * Role descriptions for tooltips/help text.
 */
export const roleDescriptions: Record<UserRole, string> = {
  Admin: 'Full system access including configuration and user management',
  IntAdmin: 'Workflow administrator — manages internal workflow, assignments, and parameters',
  ExtAdmin: 'External company administrator — manages external appraisers and assignments',
  RM: 'Relationship manager — reviews shortlisted company bids and selects a tentative winner',
  RequestMaker: 'Creates and originates appraisal requests',
  RequestChecker: 'Reviews and approves appraisal requests',
  IntAppraisalStaff: 'Internal appraisal staff — performs internal appraisals',
  IntAppraisalChecker: 'Internal appraisal checker — reviews internal appraisal work',
  IntAppraisalVerifier: 'Internal appraisal verifier — final internal sign-off',
  ExtAppraisalStaff: 'External appraisal staff — performs external (field) appraisals',
  ExtAppraisalChecker: 'External appraisal checker — reviews external appraisal work',
  ExtAppraisalVerifier: 'External appraisal verifier — final external sign-off',
  AppraisalCommittee: 'Appraisal committee member — approves/votes on tier-3 appraisals',
  MeetingSecretary: 'Meeting secretary — schedules and runs tier-3 approval meetings',
};

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
