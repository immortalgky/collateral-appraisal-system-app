import { ALL_COLUMNS } from './columnDefs';

export interface ActivityConfig {
  activityId: string;
  title: string;
  description: string;
  icon: string;
  allowedRoles: string[];
}

const ACTIVITY_CONFIG_MAP: Record<string, ActivityConfig> = {
  'appraisal-initiation-check': {
    activityId: 'appraisal-initiation-check',
    title: 'Appraisal Initiation Check',
    description: 'Tasks for reviewing initiated appraisal requests for completeness and accuracy',
    icon: 'clipboard-check',
    allowedRoles: ['Admin', 'IntAdmin', 'RequestMaker'],
  },
  'appraisal-initiation': {
    activityId: 'appraisal-initiation',
    title: 'Appraisal Initiation',
    description: 'Tasks for providing additional information when routed back',
    icon: 'file-pen',
    allowedRoles: ['Admin', 'RequestMaker'],
  },
  'appraisal-assignment': {
    activityId: 'appraisal-assignment',
    title: 'Appraisal Assignment',
    description: 'Tasks for reviewing requests and assigning to external or internal appraisal',
    icon: 'building',
    allowedRoles: ['Admin', 'IntAdmin'],
  },
  'ext-appraisal-assignment': {
    activityId: 'ext-appraisal-assignment',
    title: 'External Appraisal Assignment',
    description: 'Tasks for handling appointment, fee, and assigning to company appraiser',
    icon: 'building-columns',
    allowedRoles: ['Admin', 'ExtAdmin'],
  },
  'ext-appraisal-execution': {
    activityId: 'ext-appraisal-execution',
    title: 'External Appraisal Execution',
    description: 'Tasks for conducting external property appraisal',
    icon: 'user-tie',
    allowedRoles: ['Admin', 'ExtAdmin', 'ExtAppraisalStaff'],
  },
  'ext-appraisal-check': {
    activityId: 'ext-appraisal-check',
    title: 'External Appraisal Check',
    description: 'Tasks for reviewing external appraisal work for accuracy and completeness',
    icon: 'clipboard-check',
    allowedRoles: ['Admin', 'ExtAdmin', 'ExtAppraisalChecker'],
  },
  'ext-appraisal-verification': {
    activityId: 'ext-appraisal-verification',
    title: 'External Appraisal Verification',
    description: 'Tasks for final verification before handoff to internal',
    icon: 'shield-check',
    allowedRoles: ['Admin', 'ExtAdmin', 'ExtAppraisalVerifier'],
  },
  'appraisal-book-verification': {
    activityId: 'appraisal-book-verification',
    title: 'Appraisal Book Verification',
    description: 'Tasks for verifying the external company appraisal book',
    icon: 'book-open',
    allowedRoles: ['Admin', 'IntAdmin', 'IntAppraisalStaff'],
  },
  'int-appraisal-execution': {
    activityId: 'int-appraisal-execution',
    title: 'Internal Appraisal Execution',
    description: 'Tasks for conducting internal property appraisal',
    icon: 'user',
    allowedRoles: ['Admin', 'IntAdmin', 'IntAppraisalStaff'],
  },
  'int-appraisal-check': {
    activityId: 'int-appraisal-check',
    title: 'Internal Appraisal Check',
    description: 'Tasks for reviewing internal appraisal work for accuracy and completeness',
    icon: 'magnifying-glass-check',
    allowedRoles: ['Admin', 'IntAdmin', 'IntAppraisalChecker'],
  },
  'int-appraisal-verification': {
    activityId: 'int-appraisal-verification',
    title: 'Internal Appraisal Verification',
    description: 'Tasks for final internal verification and sign-off',
    icon: 'badge-check',
    allowedRoles: ['Admin', 'IntAdmin', 'IntAppraisalVerifier'],
  },
  'pending-approval': {
    activityId: 'pending-approval',
    title: 'Pending Approval',
    description: 'Tasks awaiting final approval from appraisal committee',
    icon: 'hourglass-half',
    allowedRoles: ['Admin', 'IntAdmin', 'AppraisalCommittee'],
  },
  'provide-additional-documents': {
    activityId: 'provide-additional-documents',
    title: 'Provide Additional Documents',
    description: 'Tasks for providing documents requested by a checker during their review',
    icon: 'file-circle-plus',
    allowedRoles: ['Admin', 'IntAdmin', 'RequestMaker'],
  },
};

export const ACTIVITY_IDS = Object.keys(ACTIVITY_CONFIG_MAP);

export function getActivityConfig(activityId: string): ActivityConfig | undefined {
  return ACTIVITY_CONFIG_MAP[activityId];
}

// Re-export for consumers that previously imported columns from here
export { ALL_COLUMNS };
