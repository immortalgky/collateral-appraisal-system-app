import type { NavContext, NavItem, NavItemWithAccess, WorkflowActivity } from './navigation';
import { isTerminalStatus } from './navigation';

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
    // All roles can view, always read-only
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
    allowedRoles: ['admin', 'task_assigner', 'appraisal_checker', 'appraisal_approver'],
    editableRoles: ['admin', 'task_assigner'], // Only admin and task_assigner can edit
  },
  {
    name: 'Appointment & Fee',
    href: ':basePath/appointment',
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
    name: 'Property Information',
    href: ':basePath/property',
    icon: 'buildings',
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
    editableRoles: ['admin', 'external_appraiser', 'internal_appraiser'],
  },
  {
    name: 'Property Information (PMA)',
    href: ':basePath/property-pma',
    icon: 'buildings',
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
    editableRoles: ['admin', 'external_appraiser', 'internal_appraiser'],
    showWhen: ctx => ctx.isPma === true,
  },
  {
    name: 'Document Checklist',
    href: ':basePath/documents',
    icon: 'file-circle-check',
    iconColor: 'text-teal-500',
    iconStyle: 'solid',
    allowedRoles: [
      'admin',
      'task_assigner',
      'external_appraiser',
      'internal_appraiser',
      'appraisal_checker',
      'appraisal_approver',
    ],
    editableRoles: ['admin', 'external_appraiser', 'internal_appraiser'],
  },
  {
    name: 'Summary & Decision',
    href: ':basePath/summary',
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
  basePath?: string;
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
function canRoleEdit(item: NavItem, role: WorkflowActivity, context?: NavContext): boolean {
  // Read-only status overrides role
  if (context && isTerminalStatus(context.status)) return false;
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
 * Filter navigation items based on user's role and optional context conditions
 */
function filterNavItemsByRole(
  items: NavItem[],
  role: WorkflowActivity,
  context?: NavContext,
): NavItem[] {
  return items.filter(item => {
    if (item.showWhen && (!context || !item.showWhen(context))) return false;
    return canRoleView(item, role);
  });
}

/**
 * Get navigation items with resolved access levels for a role
 */
function getNavItemsWithAccess(
  items: NavItem[],
  role: WorkflowActivity,
  context?: NavContext,
): NavItemWithAccess[] {
  return items
    .filter(item => {
      if (item.showWhen && (!context || !item.showWhen(context))) return false;
      return canRoleView(item, role);
    })
    .map(item => ({
      ...item,
      canView: true, // Already filtered for viewable items
      canEdit: canRoleEdit(item, role, context),
    }));
}

/**
 * Helper to generate application navigation with actual IDs
 * @param params.appraisalId - The appraisal ID from URL
 * @param params.requestId - The request ID from appraisal context (optional)
 */
export const getAppraisalNavigation = ({ appraisalId, requestId, basePath }: AppraisalNavParams): NavItem[] =>
  applicationNavigation.map(item => ({
    ...item,
    href: item.href.replace(':basePath', basePath ?? `/appraisals/${appraisalId}`).replace(':requestId', requestId ?? ''),
  }));

/**
 * Helper to generate role-filtered application navigation with actual IDs
 * @param params.appraisalId - The appraisal ID from URL
 * @param params.requestId - The request ID from appraisal context (optional)
 * @param role - User's workflow activity role
 */
export const getAppraisalNavigationByRole = (
  { appraisalId, requestId, basePath }: AppraisalNavParams,
  role: WorkflowActivity,
  context?: NavContext,
): NavItem[] =>
  filterNavItemsByRole(applicationNavigation, role, context).map(item => ({
    ...item,
    href: item.href.replace(':basePath', basePath ?? `/appraisals/${appraisalId}`).replace(':requestId', requestId ?? ''),
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
  { appraisalId, requestId, basePath }: AppraisalNavParams,
  role: WorkflowActivity,
  context?: NavContext,
): NavItemWithAccess[] =>
  getNavItemsWithAccess(applicationNavigation, role, context).map(item => ({
    ...item,
    href: item.href.replace(':basePath', basePath ?? `/appraisals/${appraisalId}`).replace(':requestId', requestId ?? ''),
  }));

/**
 * Check if a role can edit a specific appraisal page
 * @param pageName - The page name (e.g., 'Administration', 'Appointment & Fee')
 * @param role - User's workflow activity role
 */
export const canEditAppraisalPage = (
  pageName: string,
  role: WorkflowActivity,
  context?: NavContext,
): boolean => {
  const item = applicationNavigation.find(nav => nav.name === pageName);
  if (!item) return false;
  return canRoleEdit(item, role, context);
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
    documents: 'Document Checklist',
    summary: 'Summary & Decision',
    '360': '360 View',
  };

  const pageName = pathToNavMap[pageSegment];
  if (!pageName) {
    return { canView: true, canEdit: false }; // Default for unknown pages
  }

  return {
    canView: canViewAppraisalPage(pageName, role),
    canEdit: canEditAppraisalPage(pageName, role, context),
  };
};
