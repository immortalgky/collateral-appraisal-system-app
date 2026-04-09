import type { NavContext, NavItem, NavItemWithAccess, UserRole } from './navigation';
import { isTerminalStatus } from './navigation';

// Role groups reused across multiple nav items
const RM_ROLES: UserRole[] = ['RequestMaker', 'RequestChecker'];

const ALL_APPRAISAL_ROLES: UserRole[] = [
  'IntAppraisalStaff',
  'IntAppraisalChecker',
  'IntAppraisalVerifier',
  'ExtAppraisalStaff',
  'ExtAppraisalChecker',
  'ExtAppraisalVerifier',
];

const INT_APPRAISAL_STAFF_LIKE: UserRole[] = ['IntAppraisalStaff', 'ExtAppraisalStaff'];

const ALL_CHECKERS_AND_VERIFIERS: UserRole[] = [
  'IntAppraisalChecker',
  'IntAppraisalVerifier',
  'ExtAppraisalChecker',
  'ExtAppraisalVerifier',
];

/**
 * Application-specific navigation for appraisal detail pages.
 * Placeholders:
 * - :appraisalId - will be replaced with actual appraisalId
 * - :requestId - will be replaced with actual requestId (from appraisal context)
 *
 * Access Control:
 * - allowedRoles: Roles that can view this page (if empty, all roles can view)
 * - editableRoles: Roles that can edit content (if empty, no one can edit / read-only)
 * - deniedRoles: Roles explicitly denied access (takes precedence)
 */
export const applicationNavigation: NavItem[] = [
  {
    name: '360 Summary',
    href: ':basePath/360',
    icon: 'compass',
    iconColor: 'text-teal-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', ...ALL_CHECKERS_AND_VERIFIERS, 'AppraisalCommittee'],
    editableRoles: [],
  },
  {
    name: 'Request Information',
    href: ':basePath/request/:requestId',
    icon: 'square-info',
    iconColor: 'text-emerald-500',
    iconStyle: 'solid',
    // All roles can view, but it's always read-only in appraisal context
    editableRoles: [], // Read-only for all
  },
  {
    name: 'Administration',
    href: ':basePath/administration',
    icon: 'user-tie',
    iconColor: 'text-indigo-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', 'IntAdmin'],
    editableRoles: ['Admin', 'IntAdmin'], // Admin/workflow admins can edit
  },
  {
    name: 'Appointment & Fee',
    href: ':basePath/appointment',
    icon: 'calendar-check',
    iconColor: 'text-orange-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', 'IntAdmin', 'ExtAdmin', ...ALL_APPRAISAL_ROLES],
    editableRoles: ['Admin', 'ExtAdmin', ...INT_APPRAISAL_STAFF_LIKE],
  },
  {
    name: 'Property Information',
    href: ':basePath/property',
    icon: 'buildings',
    iconColor: 'text-purple-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', ...ALL_APPRAISAL_ROLES],
    editableRoles: ['Admin', ...INT_APPRAISAL_STAFF_LIKE],
    showWhen: ctx => !ctx.isPma && !ctx.isBlockCondo,
  },
  {
    name: 'Property Information (Condo)',
    href: ':basePath/block-condo',
    icon: 'buildings',
    iconColor: 'text-purple-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', ...ALL_APPRAISAL_ROLES],
    editableRoles: ['Admin', ...INT_APPRAISAL_STAFF_LIKE],
  },
  {
    name: 'Property Information (Village)',
    href: ':basePath/block-village',
    icon: 'buildings',
    iconColor: 'text-purple-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', ...ALL_APPRAISAL_ROLES],
    editableRoles: ['Admin', ...INT_APPRAISAL_STAFF_LIKE],
  },
  {
    name: 'Property Information (PMA)',
    href: ':basePath/property-pma',
    icon: 'buildings',
    iconColor: 'text-purple-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', ...ALL_APPRAISAL_ROLES],
    editableRoles: ['Admin', ...INT_APPRAISAL_STAFF_LIKE],
    showWhen: ctx => ctx.isPma === true,
  },
  {
    name: 'Document Checklist',
    href: ':basePath/documents',
    icon: 'file-circle-check',
    iconColor: 'text-teal-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', ...ALL_APPRAISAL_ROLES],
    editableRoles: ['Admin', ...INT_APPRAISAL_STAFF_LIKE],
  },
  {
    name: 'Summary & Decision',
    href: ':basePath/summary',
    icon: 'paper-plane',
    iconColor: 'text-sky-500',
    iconStyle: 'solid',
    allowedRoles: [
      'Admin',
      ...RM_ROLES,
      'IntAdmin',
      'ExtAdmin',
      ...ALL_APPRAISAL_ROLES,
      'AppraisalCommittee',
    ],
    editableRoles: [
      'Admin',
      ...RM_ROLES,
      'IntAdmin',
      'ExtAdmin',
      ...ALL_APPRAISAL_ROLES,
      'AppraisalCommittee',
    ],
  },
];

/**
 * General navigation for use in appraisal layout sidebar.
 * Uses same icon styling as main sidebar.
 */
export const generalNavigationCompact: NavItem[] = [
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
    allowedRoles: ['Admin', 'IntAdmin', 'ExtAdmin', ...ALL_APPRAISAL_ROLES],
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
    name: 'Appraisal Search',
    href: '/appraisals/search',
    icon: 'magnifying-glass',
    iconColor: 'text-cyan-500',
    iconStyle: 'solid',
    // All roles with appraisal access
  },
];

/**
 * Collapsible menu items (Standalone, Parameter) for general section
 */
export const collapsibleNavigation: NavItem[] = [
  {
    name: 'Standalone',
    href: '/standalone',
    icon: 'puzzle-piece',
    iconColor: 'text-teal-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin', 'IntAdmin', 'ExtAdmin', ...INT_APPRAISAL_STAFF_LIKE],
  },
  {
    name: 'Parameter',
    href: '/parameter',
    icon: 'sliders',
    iconColor: 'text-rose-500',
    iconStyle: 'solid',
    allowedRoles: ['Admin'],
  },
];

/**
 * Footer navigation items
 */
export const footerNavigation: NavItem[] = [
  {
    name: 'Setting',
    href: '/settings',
    icon: 'gear',
    iconColor: 'text-gray-500',
    iconStyle: 'solid',
    // All roles can access settings
  },
];

interface AppraisalNavParams {
  appraisalId: string;
  requestId?: string;
  basePath?: string;
}

/**
 * Check if any of the user's roles can view a navigation item.
 * A user can hold multiple roles; access is granted if *any* role matches.
 */
function canRolesView(item: NavItem, roles: UserRole[]): boolean {
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
}

/**
 * Check if any of the user's roles can edit a navigation item's content
 */
function canRolesEdit(item: NavItem, roles: UserRole[], context?: NavContext): boolean {
  // Read-only status overrides role
  if (context && isTerminalStatus(context.status)) return false;
  // Must be able to view first
  if (!canRolesView(item, roles)) {
    return false;
  }
  // If no editableRoles specified, no one can edit (read-only)
  if (!item.editableRoles || item.editableRoles.length === 0) {
    return false;
  }
  // Grant edit if any of the user's roles is in editableRoles
  return roles.some(r => item.editableRoles!.includes(r));
}

/**
 * Filter navigation items based on user's roles and optional context conditions
 */
function filterNavItemsByRoles(
  items: NavItem[],
  roles: UserRole[],
  context?: NavContext,
): NavItem[] {
  return items.filter(item => {
    if (item.showWhen && (!context || !item.showWhen(context))) return false;
    return canRolesView(item, roles);
  });
}

/**
 * Get navigation items with resolved access levels for a user's role set
 */
function getNavItemsWithAccess(
  items: NavItem[],
  roles: UserRole[],
  context?: NavContext,
): NavItemWithAccess[] {
  return items
    .filter(item => {
      if (item.showWhen && (!context || !item.showWhen(context))) return false;
      return canRolesView(item, roles);
    })
    .map(item => ({
      ...item,
      canView: true, // Already filtered for viewable items
      canEdit: canRolesEdit(item, roles, context),
    }));
}

/**
 * Helper to generate application navigation with actual IDs
 * @param params.appraisalId - The appraisal ID from URL
 * @param params.requestId - The request ID from appraisal context (optional)
 */
export const getAppraisalNavigation = ({
  appraisalId,
  requestId,
  basePath,
}: AppraisalNavParams): NavItem[] =>
  applicationNavigation.map(item => ({
    ...item,
    href: item.href
      .replace(':basePath', basePath ?? `/appraisals/${appraisalId}`)
      .replace(':requestId', requestId ?? ''),
  }));

/**
 * Helper to generate role-filtered application navigation with actual IDs
 * @param params.appraisalId - The appraisal ID from URL
 * @param params.requestId - The request ID from appraisal context (optional)
 * @param roles - User's roles (a user may hold multiple roles)
 */
export const getAppraisalNavigationByRoles = (
  { appraisalId, requestId, basePath }: AppraisalNavParams,
  roles: UserRole[],
  context?: NavContext,
): NavItem[] =>
  filterNavItemsByRoles(applicationNavigation, roles, context).map(item => ({
    ...item,
    href: item.href
      .replace(':basePath', basePath ?? `/appraisals/${appraisalId}`)
      .replace(':requestId', requestId ?? ''),
  }));

/**
 * Get general navigation filtered by the user's roles
 */
export const getGeneralNavigationByRoles = (roles: UserRole[]): NavItem[] =>
  filterNavItemsByRoles(generalNavigationCompact, roles);

/**
 * Get collapsible navigation filtered by the user's roles
 */
export const getCollapsibleNavigationByRoles = (roles: UserRole[]): NavItem[] =>
  filterNavItemsByRoles(collapsibleNavigation, roles);

/**
 * Get footer navigation filtered by the user's roles
 */
export const getFooterNavigationByRoles = (roles: UserRole[]): NavItem[] =>
  filterNavItemsByRoles(footerNavigation, roles);

/**
 * Get application navigation with access levels for each item
 * Returns items the user can view, with canView and canEdit flags
 */
export const getAppraisalNavigationWithAccess = (
  { appraisalId, requestId, basePath }: AppraisalNavParams,
  roles: UserRole[],
  context?: NavContext,
): NavItemWithAccess[] =>
  getNavItemsWithAccess(applicationNavigation, roles, context).map(item => ({
    ...item,
    href: item.href
      .replace(':basePath', basePath ?? `/appraisals/${appraisalId}`)
      .replace(':requestId', requestId ?? ''),
  }));

/**
 * Check if the user (with its role set) can edit a specific appraisal page
 */
export const canEditAppraisalPage = (
  pageName: string,
  roles: UserRole[],
  context?: NavContext,
): boolean => {
  const item = applicationNavigation.find(nav => nav.name === pageName);
  if (!item) return false;
  return canRolesEdit(item, roles, context);
};

/**
 * Check if the user (with its role set) can view a specific appraisal page
 */
export const canViewAppraisalPage = (pageName: string, roles: UserRole[]): boolean => {
  const item = applicationNavigation.find(nav => nav.name === pageName);
  if (!item) return false;
  return canRolesView(item, roles);
};

/**
 * Get access level for a specific page path
 * Useful for checking access based on current route
 */
export const getPageAccessByPath = (
  path: string,
  roles: UserRole[],
  context?: NavContext,
): { canView: boolean; canEdit: boolean } => {
  // Extract the page segment from paths like /appraisals/:id/administration or /tasks/:id/administration
  const pathSegments = path.split('/').filter(Boolean);
  const pageSegment = pathSegments[2]; // 'administration', 'appointment', etc. (3rd segment for both /appraisals/:id/... and /tasks/:id/...)

  // Map path segments to navigation items
  const pathToNavMap: Record<string, string> = {
    request: 'Request Information',
    administration: 'Administration',
    appointment: 'Appointment & Fee',
    property: 'Property Information',
    'block-condo': 'Property Information (Condo)',
    'block-village': 'Property Information (Village)',
    documents: 'Document Checklist',
    summary: 'Summary & Decision',
    '360': '360 View',
  };

  const pageName = pathToNavMap[pageSegment];
  if (!pageName) {
    return { canView: true, canEdit: false }; // Default for unknown pages
  }

  return {
    canView: canViewAppraisalPage(pageName, roles),
    canEdit: canEditAppraisalPage(pageName, roles, context),
  };
};
