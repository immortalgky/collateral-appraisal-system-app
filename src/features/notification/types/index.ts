export type NotificationType =
  | 'TaskAssigned'
  | 'TaskCompleted'
  | 'WorkflowTransition'
  | 'SystemNotification'
  | 'DocumentFollowupRaised'
  | 'DocumentFollowupResolved'
  | 'DocumentFollowupCancelled'
  | 'DocumentLineItemDeclined'
  | 'ReportReady'
  | 'ReportFailed'
  | 'QuotationAutoAssignIncomplete'
  | 'AssignmentEmailFailed';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  isRead: boolean;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
}

export const notificationTypeConfig: Record<
  NotificationType,
  { icon: string; iconStyle: 'solid' | 'regular'; color: string }
> = {
  TaskAssigned: {
    icon: 'clipboard-list',
    iconStyle: 'solid',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
  },
  TaskCompleted: {
    icon: 'circle-check',
    iconStyle: 'solid',
    color: 'text-green-500 bg-green-50 dark:bg-green-500/10',
  },
  WorkflowTransition: {
    icon: 'arrow-right-arrow-left',
    iconStyle: 'solid',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
  },
  SystemNotification: {
    icon: 'gear',
    iconStyle: 'solid',
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10',
  },
  DocumentFollowupRaised: {
    icon: 'file-circle-plus',
    iconStyle: 'solid',
    color: 'text-amber-500 bg-(--palette-warn-wash)',
  },
  DocumentFollowupResolved: {
    icon: 'file-circle-check',
    iconStyle: 'solid',
    color: 'text-green-500 bg-green-50 dark:bg-green-500/10',
  },
  DocumentFollowupCancelled: {
    icon: 'file-circle-xmark',
    iconStyle: 'solid',
    color: 'text-(--palette-gray-500) bg-(--palette-surface-2)',
  },
  DocumentLineItemDeclined: {
    icon: 'hand',
    iconStyle: 'solid',
    color: 'text-red-500 bg-(--palette-req-wash)',
  },
  ReportReady: {
    icon: 'file-check',
    iconStyle: 'solid',
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
  },
  ReportFailed: {
    icon: 'file-xmark',
    iconStyle: 'solid',
    color: 'text-red-500 bg-(--palette-req-wash)',
  },
  QuotationAutoAssignIncomplete: {
    icon: 'triangle-exclamation',
    iconStyle: 'solid',
    color: 'text-amber-500 bg-(--palette-warn-wash)',
  },
  AssignmentEmailFailed: {
    icon: 'circle-exclamation',
    iconStyle: 'solid',
    color: 'text-(--palette-danger) bg-(--palette-req-wash)',
  },
};

/** A type this build does not know yet (the server ships first) gets a plain bell, not a crash. */
export const getNotificationConfig = (type: string) =>
  notificationTypeConfig[type as NotificationType] ?? {
    icon: 'bell',
    iconStyle: 'regular' as const,
    color: 'text-(--palette-gray-500) bg-(--palette-surface-3)',
  };
