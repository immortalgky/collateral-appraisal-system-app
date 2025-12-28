import type { NavItem, NavItemWithAccess, WorkflowActivity } from './navigation';

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
    name: 'Request Information',
    href: '/appraisal/:appraisalId/request/:requestId',
    icon: 'square-info',
    iconColor: 'text-emerald-500',
    iconStyle: 'solid',
    // All roles can view, but it's always read-only in appraisal context
    editableRoles: [], // Read-only for all
  },
  {
    name: 'Administration',
    href: '/appraisal/:appraisalId/administration',
    icon: 'user-tie',
    iconColor: 'text-indigo-500',
    iconStyle: 'solid',
    allowedRoles: ['admin', 'task_assigner', 'appraisal_checker', 'appraisal_approver'],
    editableRoles: ['admin', 'task_assigner'], // Only admin and task_assigner can edit
  },
  {
    name: 'Appointment & Fee',
    href: '/appraisal/:appraisalId/appointment',
    icon: 'calendar-check',
    iconColor: 'text-orange-500',
    iconStyle: 'solid',
    allowedRoles: [
      'admin',
      'task_assigner',
      'external_appraiser',
      'internal_appraiser',
      'appraisal_checker',
      'appraisal_approver',
    ],
    editableRoles: ['admin', 'task_assigner', 'external_appraiser', 'internal_appraiser'],
  },
  {
    name: 'Summary & Decision',
    href: '/appraisal/:appraisalId/summary',
    icon: 'paper-plane',
    iconColor: 'text-sky-500',
    iconStyle: 'solid',
    allowedRoles: ['admin', 'appraisal_checker', 'appraisal_approver', 'report_reviewer'],
    editableRoles: ['admin', 'appraisal_checker', 'appraisal_approver'],
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
    name: 'Notification',
    href: '/notification',
    icon: 'bell',
    iconColor: 'text-amber-500',
    iconStyle: 'solid',
    // All roles can access notifications
  },
  {
    name: 'Appraisal Search',
    href: '/appraisal/search',
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
}

/**
 * Check if a role can view a navigation item
 */
function canRoleView(item: NavItem, role: WorkflowActivity): boolean {
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
}

/**
 * Check if a role can edit a navigation item's content
 */
function canRoleEdit(item: NavItem, role: WorkflowActivity): boolean {
  // Must be able to view first
  if (!canRoleView(item, role)) {
    return false;
  }
  // If no editableRoles specified, no one can edit (read-only)
  if (!item.editableRoles || item.editableRoles.length === 0) {
    return false;
  }
  // Check if role is in editableRoles
  return item.editableRoles.includes(role);
}

/**
 * Filter navigation items based on user's role (only returns viewable items)
 */
function filterNavItemsByRole(items: NavItem[], role: WorkflowActivity): NavItem[] {
  return items.filter(item => canRoleView(item, role));
}

/**
 * Get navigation items with resolved access levels for a role
 */
function getNavItemsWithAccess(items: NavItem[], role: WorkflowActivity): NavItemWithAccess[] {
  return items
    .filter(item => canRoleView(item, role))
    .map(item => ({
      ...item,
      canView: true, // Already filtered for viewable items
      canEdit: canRoleEdit(item, role),
    }));
}

/**
 * Helper to generate application navigation with actual IDs
 * @param params.appraisalId - The appraisal ID from URL
 * @param params.requestId - The request ID from appraisal context (optional)
 */
export const getAppraisalNavigation = ({ appraisalId, requestId }: AppraisalNavParams): NavItem[] =>
  applicationNavigation.map(item => ({
    ...item,
    href: item.href.replace(':appraisalId', appraisalId).replace(':requestId', requestId ?? ''),
  }));

/**
 * Helper to generate role-filtered application navigation with actual IDs
 * @param params.appraisalId - The appraisal ID from URL
 * @param params.requestId - The request ID from appraisal context (optional)
 * @param role - User's workflow activity role
 */
export const getAppraisalNavigationByRole = (
  { appraisalId, requestId }: AppraisalNavParams,
  role: WorkflowActivity,
): NavItem[] =>
  filterNavItemsByRole(applicationNavigation, role).map(item => ({
    ...item,
    href: item.href.replace(':appraisalId', appraisalId).replace(':requestId', requestId ?? ''),
  }));

/**
 * Get general navigation filtered by role
 */
export const getGeneralNavigationByRole = (role: WorkflowActivity): NavItem[] =>
  filterNavItemsByRole(generalNavigationCompact, role);

/**
 * Get collapsible navigation filtered by role
 */
export const getCollapsibleNavigationByRole = (role: WorkflowActivity): NavItem[] =>
  filterNavItemsByRole(collapsibleNavigation, role);

/**
 * Get footer navigation filtered by role
 */
export const getFooterNavigationByRole = (role: WorkflowActivity): NavItem[] =>
  filterNavItemsByRole(footerNavigation, role);

/**
 * Get application navigation with access levels for each item
 * Returns items the role can view, with canView and canEdit flags
 */
export const getAppraisalNavigationWithAccess = (
  { appraisalId, requestId }: AppraisalNavParams,
  role: WorkflowActivity,
): NavItemWithAccess[] =>
  getNavItemsWithAccess(applicationNavigation, role).map(item => ({
    ...item,
    href: item.href.replace(':appraisalId', appraisalId).replace(':requestId', requestId ?? ''),
  }));

/**
 * Check if a role can edit a specific appraisal page
 * @param pageName - The page name (e.g., 'Administration', 'Appointment & Fee')
 * @param role - User's workflow activity role
 */
export const canEditAppraisalPage = (pageName: string, role: WorkflowActivity): boolean => {
  const item = applicationNavigation.find(nav => nav.name === pageName);
  if (!item) return false;
  return canRoleEdit(item, role);
};

/**
 * Check if a role can view a specific appraisal page
 * @param pageName - The page name (e.g., 'Administration', 'Appointment & Fee')
 * @param role - User's workflow activity role
 */
export const canViewAppraisalPage = (pageName: string, role: WorkflowActivity): boolean => {
  const item = applicationNavigation.find(nav => nav.name === pageName);
  if (!item) return false;
  return canRoleView(item, role);
};

/**
 * Get access level for a specific page path
 * Useful for checking access based on current route
 */
export const getPageAccessByPath = (
  path: string,
  role: WorkflowActivity,
): { canView: boolean; canEdit: boolean } => {
  // Extract the page segment from paths like /appraisal/:id/administration
  const pathSegments = path.split('/').filter(Boolean);
  const pageSegment = pathSegments[2]; // 'administration', 'appointment', etc.

  // Map path segments to navigation items
  const pathToNavMap: Record<string, string> = {
    request: 'Request Information',
    administration: 'Administration',
    appointment: 'Appointment & Fee',
    summary: 'Summary & Decision',
  };

  const pageName = pathToNavMap[pageSegment];
  if (!pageName) {
    return { canView: true, canEdit: false }; // Default for unknown pages
  }

  return {
    canView: canViewAppraisalPage(pageName, role),
    canEdit: canEditAppraisalPage(pageName, role),
  };
};
