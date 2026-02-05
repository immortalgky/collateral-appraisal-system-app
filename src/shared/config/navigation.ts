/**
 * Workflow Activity Types (User Roles)
 * Each activity represents a different user role in the appraisal workflow
 */
export type WorkflowActivity =
  | 'admin' // System Administrator - full access
  | 'request_creator' // Bank staff who creates appraisal requests
  | 'request_approver' // Approves/rejects incoming requests
  | 'task_assigner' // Assigns tasks to appraisers
  | 'external_appraiser' // External appraiser who performs field appraisals
  | 'internal_appraiser' // Internal appraiser
  | 'appraisal_checker' // Reviews and checks appraisal reports
  | 'appraisal_approver' // Final approval of appraisal reports
  | 'report_reviewer' // Reviews completed reports
  | 'viewer'; // Read-only access

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
  allowedRoles?: WorkflowActivity[];
  /** Roles that can edit content on this page. If empty/undefined, inherits from allowedRoles */
  editableRoles?: WorkflowActivity[];
  /** Roles that are explicitly denied access. Takes precedence over allowedRoles */
  deniedRoles?: WorkflowActivity[];
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
    name: 'Task',
    href: '/tasks',
    icon: 'list-check',
    iconColor: 'text-purple-500',
    iconStyle: 'solid',
    allowedRoles: [
      'admin',
      'task_assigner',
      'external_appraiser',
      'internal_appraiser',
      'appraisal_checker',
      'appraisal_approver',
    ],
  },
  {
    name: 'Request',
    href: '/requests',
    icon: 'folder-open',
    iconColor: 'text-emerald-500',
    iconStyle: 'solid',
    allowedRoles: ['admin', 'request_creator', 'request_approver', 'task_assigner', 'viewer'],
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
        allowedRoles: ['admin', 'request_creator'],
      },
    ],
  },
  {
    name: 'Appraisal',
    href: '/appraisal',
    icon: 'magnifying-glass-chart',
    iconColor: 'text-cyan-500',
    iconStyle: 'solid',
    allowedRoles: [
      'admin',
      'external_appraiser',
      'internal_appraiser',
      'appraisal_checker',
      'appraisal_approver',
      'report_reviewer',
      'viewer',
    ],
    children: [
      {
        name: 'Search',
        href: '/appraisal/search',
        icon: 'magnifying-glass',
        iconColor: 'text-cyan-500',
        iconStyle: 'solid',
      },
      {
        name: 'My Appraisals',
        href: '/appraisal/my-appraisals',
        icon: 'folder-user',
        iconColor: 'text-cyan-500',
        iconStyle: 'solid',
        allowedRoles: ['external_appraiser', 'internal_appraiser'],
      },
      {
        name: 'Pending Review',
        href: '/appraisal/pending-review',
        icon: 'clipboard-check',
        iconColor: 'text-amber-500',
        iconStyle: 'solid',
        allowedRoles: ['admin', 'appraisal_checker', 'appraisal_approver'],
      },
    ],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: 'chart-line',
    iconColor: 'text-indigo-500',
    iconStyle: 'solid',
    allowedRoles: ['admin', 'report_reviewer', 'appraisal_approver'],
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
        allowedRoles: ['admin'],
      },
    ],
  },
  {
    name: 'Notification',
    href: '/notification',
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
    allowedRoles: ['admin', 'external_appraiser', 'internal_appraiser'],
  },
  {
    name: 'Parameter',
    href: '/parameter',
    icon: 'sliders',
    iconColor: 'text-rose-500',
    iconStyle: 'solid',
    allowedRoles: ['admin'],
  },
  {
    name: 'User Management',
    href: '/users',
    icon: 'users',
    iconColor: 'text-violet-500',
    iconStyle: 'solid',
    allowedRoles: ['admin'],
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
    ],
  },
  {
    name: 'Development',
    href: '/dev',
    icon: 'code',
    iconColor: 'text-orange-500',
    iconStyle: 'solid',
    allowedRoles: ['admin'], // Only admin can see development menu
    children: [
      {
        name: 'Property Information',
        href: '/dev/property-information',
        icon: 'file-circle-plus',
        iconColor: 'text-emerald-500',
        iconStyle: 'solid',
      },
      {
        name: 'Land Detail',
        href: '/dev/land-detail',
        icon: 'file-circle-plus',
        iconColor: 'text-emerald-500',
        iconStyle: 'solid',
      },
      {
        name: 'Market Survey',
        href: '/market-survey',
        icon: 'magnifying-glass-location',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
      {
        name: 'Land Detail',
        href: '/land-detail',
        icon: 'earth-asia',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
      {
        name: 'Building Detail',
        href: '/building-detail',
        icon: 'house',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
      {
        name: 'Condo Detail',
        href: '/condo-detail',
        icon: 'house',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
      {
        name: 'Land and Building Detail',
        href: '/land-building-detail',
        icon: 'house',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
      {
        name: 'Land and Building PMA',
        href: '/land-building-pma',
        icon: 'house',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
      {
        name: 'Condominium PMA',
        href: '/condo-pma',
        icon: 'house',
        iconColor: 'text-orange-500',
        iconStyle: 'solid',
      },
    ],
  },
];

/**
 * Filter navigation items based on user's role
 */
export function getNavigationByRole(role: WorkflowActivity): NavItem[] {
  const filterItems = (items: NavItem[]): NavItem[] => {
    return (
      items
        .filter(item => {
          // Check if explicitly denied
          if (item.deniedRoles?.includes(role)) {
            return false;
          }
          // If no allowedRoles specified, allow all
          if (!item.allowedRoles || item.allowedRoles.length === 0) {
            return true;
          }
          // Check if role is in allowedRoles
          return item.allowedRoles.includes(role);
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
export const roleDisplayNames: Record<WorkflowActivity, string> = {
  admin: 'System Administrator',
  request_creator: 'Request Creator',
  request_approver: 'Request Approver',
  task_assigner: 'Task Assigner',
  external_appraiser: 'External Appraiser',
  internal_appraiser: 'Internal Appraiser',
  appraisal_checker: 'Appraisal Checker',
  appraisal_approver: 'Appraisal Approver',
  report_reviewer: 'Report Reviewer',
  viewer: 'Viewer',
};

/**
 * Role descriptions for tooltips/help text
 */
export const roleDescriptions: Record<WorkflowActivity, string> = {
  admin: 'Full system access including configuration and user management',
  request_creator: 'Can create and manage appraisal requests',
  request_approver: 'Can approve or reject incoming appraisal requests',
  task_assigner: 'Can assign appraisal tasks to appraisers',
  external_appraiser: 'External appraiser who performs field appraisals',
  internal_appraiser: 'Internal bank appraiser',
  appraisal_checker: 'Reviews and validates appraisal reports',
  appraisal_approver: 'Final approval authority for appraisal reports',
  report_reviewer: 'Can view and review completed appraisal reports',
  viewer: 'Read-only access to view appraisals and requests',
};

/**
 * Get all available roles
 */
export const allRoles: WorkflowActivity[] = [
  'admin',
  'request_creator',
  'request_approver',
  'task_assigner',
  'external_appraiser',
  'internal_appraiser',
  'appraisal_checker',
  'appraisal_approver',
  'report_reviewer',
  'viewer',
];

/**
 * Legacy export for backward compatibility
 * @deprecated Use getNavigationByRole() instead
 */
export const mainNavigation = navigationConfig;

export const userNavigation = [
  { name: 'Your profile', href: '/profile' },
  { name: 'Sign out', href: '/logout' },
];
