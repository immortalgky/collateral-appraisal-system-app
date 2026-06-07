/**
 * Operational Reports route path constants.
 * Routes live at /reports/operational/:slug where slug matches the report config.
 * Menu items already exist server-side gated by REPORT_OP_VIEW permission.
 */
export const OPERATIONAL_REPORT_PATHS = {
  root: '/reports/operational',
  rcas001: '/reports/operational/rcas001',
  rcas002: '/reports/operational/rcas002',
  rcas003: '/reports/operational/rcas003',
  rcas004: '/reports/operational/rcas004',
  rcas005: '/reports/operational/rcas005',
  rcas006: '/reports/operational/rcas006',
  rcas007: '/reports/operational/rcas007',
  rcas008: '/reports/operational/rcas008',
  rcas009: '/reports/operational/rcas009',
  rcas010: '/reports/operational/rcas010',
  rcas011: '/reports/operational/rcas011',
  rcas012: '/reports/operational/rcas012',
} as const;

/**
 * Permission code used for all operational report pages.
 * Server-side menu items are already gated by this permission.
 */
export const OPERATIONAL_REPORT_PERMISSION = 'REPORT_OP_VIEW' as const;
