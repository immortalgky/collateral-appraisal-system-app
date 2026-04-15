export type NotificationType =
  | 'TaskAssigned'
  | 'TaskCompleted'
  | 'WorkflowTransition'
  | 'SystemNotification'
  | 'DocumentFollowupRaised'
  | 'DocumentFollowupResolved'
  | 'DocumentFollowupCancelled'
  | 'DocumentLineItemDeclined';

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
  TaskAssigned: { icon: 'clipboard-list', iconStyle: 'solid', color: 'text-blue-500 bg-blue-50' },
  TaskCompleted: { icon: 'circle-check', iconStyle: 'solid', color: 'text-green-500 bg-green-50' },
  WorkflowTransition: { icon: 'arrow-right-arrow-left', iconStyle: 'solid', color: 'text-purple-500 bg-purple-50' },
  SystemNotification: { icon: 'gear', iconStyle: 'solid', color: 'text-orange-500 bg-orange-50' },
  DocumentFollowupRaised: { icon: 'file-circle-plus', iconStyle: 'solid', color: 'text-amber-500 bg-amber-50' },
  DocumentFollowupResolved: { icon: 'file-circle-check', iconStyle: 'solid', color: 'text-green-500 bg-green-50' },
  DocumentFollowupCancelled: { icon: 'file-circle-xmark', iconStyle: 'solid', color: 'text-gray-500 bg-gray-50' },
  DocumentLineItemDeclined: { icon: 'hand', iconStyle: 'solid', color: 'text-red-500 bg-red-50' },
};
