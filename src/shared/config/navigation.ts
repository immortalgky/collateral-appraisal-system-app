/**
 * User Roles
 * Mirrors the backend role table (see seed SQL).
 * - Admin:                System-wide administrator (full access, platform owner)
 * - IntAdmin:             Workflow administrator (internal side)
 * - ExtAdmin:             External company administrator
 * - RequestMaker:         Request maker / originator (RM) (bank staff)
 * - RequestChecker:       Request checker / originator (RM) supervisor (bank staff)
 * - IntAppraisalStaff:    Internal appraisal staff (executes internal appraisals)
 * - IntAppraisalChecker:  Internal appraisal checker (reviews internal work)
 * - IntAppraisalVerifier: Internal appraisal verifier (final internal sign-off)
 * - ExtAppraisalStaff:    External appraisal staff (executes external appraisals)
 * - ExtAppraisalChecker:  External appraisal checker (reviews external work)
 * - ExtAppraisalVerifier: External appraisal verifier (final external sign-off)
 * - AppraisalCommittee:   Appraisal committee member (approves / votes)
 * - MeetingSecretary:     Meeting secretary — schedules/runs tier-3 approval meetings
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

/**
 * Contextual data used by NavItem.showWhen to conditionally display items
 */
export type NavContext = {
  isPma?: boolean;
  isBlockCondo?: boolean;
  status?: string;
};

/** Configurable list of statuses that make all menus read-only. Add/remove as needed. */
export const TERMINAL_STATUSES: string[] = ['completed', 'approved', 'rejected', 'cancelled'];

export function isTerminalStatus(status: string | undefined): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.some(s => s.toLowerCase() === status.toLowerCase());
}

/**
 * Navigation item with role-based access control
 */
export type NavItem = {
  name: string;
  href: string;
  icon: string;
  iconColor?: string;
  iconStyle?: string;
  children?: NavItem[];
  /** Roles that can view this menu item. If empty/undefined, all roles can view */
  allowedRoles?: UserRole[];
  /** Roles that can edit content on this page. If empty/undefined, inherits from allowedRoles */
  editableRoles?: UserRole[];
  /** Roles that are explicitly denied access. Takes precedence over allowedRoles */
  deniedRoles?: UserRole[];
  /** Optional condition. Item shown only when this returns true. If undefined, always shown. */
  showWhen?: (context: NavContext) => boolean;
};

/**
 * Navigation item with resolved access level for current user
 */
export type NavItemWithAccess = NavItem & {
  /** Whether the current user can view this item */
  canView: boolean;
  /** Whether the current user can edit content on this page */
  canEdit: boolean;
};

// Convenience role groups to keep allowedRoles concise and consistent
const ALL_APPRAISAL_ROLES: UserRole[] = [
  'IntAppraisalStaff',
  'IntAppraisalChecker',
  'IntAppraisalVerifier',
  'ExtAppraisalStaff',
  'ExtAppraisalChecker',
  'ExtAppraisalVerifier',
];

/**
 * Complete navigation configuration with role-based access
 */
export const navigationConfig: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: 'gauge',
    iconColor: 'text-blue-500',
    iconStyle: 'solid',
    // All roles can access dashboard
  },
  {
    name: 'Request',
    href: '/requests',
    icon: 'folder-open',
    iconColor: 'text-emerald-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', 'IntAdmin', 'RequestMaker'],
    children: [
      {
        name: 'Request Listing',
        href: '/requests',
        icon: 'list',
        iconColor: 'text-emerald-500',
        iconStyle: 'solid',
      },
      {
        name: 'Create Request',
        href: '/requests/new',
        icon: 'file-circle-plus',
        iconColor: 'text-emerald-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'IntAdmin', 'RequestMaker'],
      },
    ],
  },
  {
    name: 'Task',
    href: '/tasks',
    icon: 'list-check',
    iconColor: 'text-purple-500',
    iconStyle: 'solid',
    allowedRoles: [
      'Admin',
      'IntAdmin',
      'ExtAdmin',
      'RequestMaker',
      ...ALL_APPRAISAL_ROLES,
      'AppraisalCommittee',
    ],
    children: [
      {
        name: 'All Tasks',
        href: '/tasks',
        icon: 'list',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
      },
      {
        name: 'Appraisal Initiation Check',
        href: '/tasks/activity/appraisal-initiation-check',
        icon: 'clipboard-check',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'RequestChecker'],
      },
      {
        name: 'Appraisal Initiation',
        href: '/tasks/activity/appraisal-initiation',
        icon: 'file-pen',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'RequestMaker'],
      },
      {
        name: 'Appraisal Assignment',
        href: '/tasks/activity/appraisal-assignment',
        icon: 'building',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'IntAdmin'],
      },
      {
        name: 'External Appraisal Assignment',
        href: '/tasks/activity/ext-appraisal-assignment',
        icon: 'building-columns',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'ExtAdmin'],
      },
      {
        name: 'External Appraisal Execution',
        href: '/tasks/activity/ext-appraisal-execution',
        icon: 'user-tie',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'ExtAppraisalStaff'],
      },
      {
        name: 'External Appraisal Check',
        href: '/tasks/activity/ext-appraisal-check',
        icon: 'clipboard-check',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'ExtAppraisalChecker'],
      },
      {
        name: 'External Appraisal Verification',
        href: '/tasks/activity/ext-appraisal-verification',
        icon: 'shield-check',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'ExtAppraisalVerifier'],
      },
      {
        name: 'Appraisal Book Verification',
        href: '/tasks/activity/appraisal-book-verification',
        icon: 'book-open',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'IntAppraisalStaff'],
      },
      {
        name: 'Internal Appraisal Execution',
        href: '/tasks/activity/int-appraisal-execution',
        icon: 'user',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'IntAppraisalStaff'],
      },
      {
        name: 'Internal Appraisal Check',
        href: '/tasks/activity/int-appraisal-check',
        icon: 'magnifying-glass-check',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'IntAppraisalChecker'],
      },
      {
        name: 'Internal Appraisal Verification',
        href: '/tasks/activity/int-appraisal-verification',
        icon: 'badge-check',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'IntAppraisalVerifier'],
      },
      {
        name: 'Pending Approval',
        href: '/tasks/activity/pending-approval',
        icon: 'hourglass-half',
        iconColor: 'text-purple-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'AppraisalCommittee'],
      },
    ],
  },
  {
    name: 'Appraisal',
    href: '/appraisals',
    icon: 'magnifying-glass-chart',
    iconColor: 'text-cyan-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', 'IntAdmin', 'ExtAdmin', ...ALL_APPRAISAL_ROLES, 'AppraisalCommittee'],
    children: [
      {
        name: 'Search',
        href: '/appraisals/search',
        icon: 'magnifying-glass',
        iconColor: 'text-cyan-500',
        iconStyle: 'solid',
      },
      {
        name: 'My Appraisals',
        href: '/appraisals/my-appraisals',
        icon: 'folder-user',
        iconColor: 'text-cyan-500',
        iconStyle: 'solid',
        allowedRoles: ALL_APPRAISAL_ROLES,
      },
      {
        name: 'Pending Review',
        href: '/appraisals/pending-review',
        icon: 'clipboard-check',
        iconColor: 'text-amber-500',
        iconStyle: 'solid',
        allowedRoles: [
          'Admin',
          'IntAdmin',
          'IntAppraisalChecker',
          'IntAppraisalVerifier',
          'ExtAppraisalChecker',
          'ExtAppraisalVerifier',
        ],
      },
    ],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: 'chart-line',
    iconColor: 'text-indigo-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', 'IntAdmin', 'AppraisalCommittee'],
    children: [
      {
        name: 'Completed Reports',
        href: '/reports/completed',
        icon: 'file-check',
        iconColor: 'text-indigo-500',
        iconStyle: 'solid',
      },
      {
        name: 'Statistics',
        href: '/reports/statistics',
        icon: 'chart-pie',
        iconColor: 'text-indigo-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'IntAdmin'],
      },
    ],
  },
  {
    name: 'Meetings',
    href: '/meetings',
    icon: 'people-arrows',
    iconColor: 'text-blue-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', 'IntAdmin', 'MeetingSecretary', 'AppraisalCommittee'],
    children: [
      {
        name: 'All Meetings',
        href: '/meetings',
        icon: 'list',
        iconColor: 'text-blue-500',
        iconStyle: 'solid',
      },
      {
        name: 'Awaiting Meeting Queue',
        href: '/meetings/queue',
        icon: 'hourglass-half',
        iconColor: 'text-blue-500',
        iconStyle: 'solid',
      },
    ],
  },
  {
    name: 'Notification',
    href: '/notifications',
    icon: 'bell',
    iconColor: 'text-amber-500',
    iconStyle: 'solid',
    // All roles can access notifications
  },
  {
    name: 'Standalone',
    href: '/standalone',
    icon: 'puzzle-piece',
    iconColor: 'text-teal-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', 'IntAdmin', 'ExtAdmin', 'IntAppraisalStaff', 'ExtAppraisalStaff'],
  },
  {
    name: 'Parameter',
    href: '/parameter',
    icon: 'sliders',
    iconColor: 'text-rose-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin'],
  },
  {
    name: 'User Management',
    href: '/users',
    icon: 'users',
    iconColor: 'text-violet-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', 'IntAdmin', 'ExtAdmin'],
    children: [
      {
        name: 'User List',
        href: '/users',
        icon: 'list',
        iconColor: 'text-violet-500',
        iconStyle: 'solid',
      },
      {
        name: 'Role Assignment',
        href: '/users/roles',
        icon: 'user-shield',
        iconColor: 'text-violet-500',
        iconStyle: 'solid',
      },
      {
        name: 'Permissions',
        href: '/admin/permissions',
        icon: 'shield-halved',
        iconColor: 'text-violet-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin'],
      },
      {
        name: 'Roles',
        href: '/admin/roles',
        icon: 'user-shield',
        iconColor: 'text-violet-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin'],
      },
      {
        name: 'Groups',
        href: '/admin/groups',
        icon: 'users-rectangle',
        iconColor: 'text-violet-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'IntAdmin', 'ExtAdmin'],
      },
      {
        name: 'Users',
        href: '/admin/users',
        icon: 'circle-user',
        iconColor: 'text-violet-500',
        iconStyle: 'solid',
        allowedRoles: ['Admin', 'IntAdmin', 'ExtAdmin'],
      },
    ],
  },
  {
    name: 'Workflow Builder',
    href: '/workflow-builder',
    icon: 'diagram-project',
    iconColor: 'text-orange-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', 'IntAdmin'],
    children: [
      {
        name: 'Workflow Listing',
        href: '/workflow-builder',
        icon: 'list',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
      {
        name: 'Create Workflow',
        href: '/workflow-builder/new',
        icon: 'file-circle-plus',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
    ],
  },
  {
    name: 'Template Management',
    href: '/market-comparable-factors',
    icon: 'layer-group',
    iconColor: 'text-teal-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', 'IntAdmin'],
    children: [
      {
        name: 'MC Factors',
        href: '/market-comparable-factors',
        icon: 'database',
        iconColor: 'text-teal-500',
        iconStyle: 'solid',
      },
      {
        name: 'MC Templates',
        href: '/market-comparable-templates',
        icon: 'rectangle-list',
        iconColor: 'text-teal-500',
        iconStyle: 'solid',
      },
      {
        name: 'Comparative Templates',
        href: '/comparative-templates',
        icon: 'chart-mixed',
        iconColor: 'text-teal-500',
        iconStyle: 'solid',
      },
    ],
  },
];

/**
 * Filter navigation items based on the user's role set.
 * Access is granted if *any* of the user's roles is in `allowedRoles`,
 * and none of the user's roles is in `deniedRoles`.
 */
export function getNavigationByRoles(roles: UserRole[]): NavItem[] {
  const filterItems = (items: NavItem[]): NavItem[] => {
    return (
      items
        .filter(item => {
          // Check if any of the user's roles is explicitly denied
          if (item.deniedRoles && roles.some(r => item.deniedRoles!.includes(r))) {
            return false;
          }
          // If no allowedRoles specified, allow all
          if (!item.allowedRoles || item.allowedRoles.length === 0) {
            return true;
          }
          // Grant access if any of the user's roles is in allowedRoles
          return roles.some(r => item.allowedRoles!.includes(r));
        })
        .map(item => ({
          ...item,
          // Recursively filter children
          children: item.children ? filterItems(item.children) : undefined,
        }))
        // Remove items whose children are all filtered out (if they had children)
        .filter(
          item =>
            !item.children ||
            item.children.length > 0 ||
            !navigationConfig.find(n => n.href === item.href)?.children,
        )
    );
  };

  return filterItems(navigationConfig);
}

/**
 * Role display names for UI
 */
export const roleDisplayNames: Record<UserRole, string> = {
  Admin: 'System Administrator',
  IntAdmin: 'Workflow Administrator',
  ExtAdmin: 'External Company Administrator',
  RequestMaker: 'Request Maker',
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
 * Role descriptions for tooltips/help text
 */
export const roleDescriptions: Record<UserRole, string> = {
  Admin: 'Full system access including configuration and user management',
  IntAdmin: 'Workflow administrator — manages internal workflow, assignments, and parameters',
  ExtAdmin: 'External company administrator — manages external appraisers and assignments',
  RequestMaker: 'Creates and originates appraisal requests',
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
 * Get all available roles
 */
export const allRoles: UserRole[] = [
  'Admin',
  'IntAdmin',
  'ExtAdmin',
  'RequestMaker',
  'IntAppraisalStaff',
  'IntAppraisalChecker',
  'IntAppraisalVerifier',
  'ExtAppraisalStaff',
  'ExtAppraisalChecker',
  'ExtAppraisalVerifier',
  'AppraisalCommittee',
  'MeetingSecretary',
];

/**
 * Legacy export for backward compatibility
 * @deprecated Use getNavigationByRoles() instead
 */
export const mainNavigation = navigationConfig;

export const userNavigation = [
  { name: 'Your profile', href: '/profile' },
  { name: 'Sign out', href: '/logout' },
];
