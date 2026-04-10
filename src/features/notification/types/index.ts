export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'WORKFLOW_TRANSITION'
  | 'SystemNotification'
  | 'DOCUMENT_FOLLOWUP_RAISED'
  | 'DOCUMENT_FOLLOWUP_RESOLVED'
  | 'DOCUMENT_FOLLOWUP_CANCELLED'
  | 'DOCUMENT_LINE_ITEM_DECLINED';

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
  TASK_ASSIGNED: { icon: 'clipboard-list', iconStyle: 'solid', color: 'text-blue-500 bg-blue-50' },
  TASK_COMPLETED: { icon: 'circle-check', iconStyle: 'solid', color: 'text-green-500 bg-green-50' },
  WORKFLOW_TRANSITION: { icon: 'arrow-right-arrow-left', iconStyle: 'solid', color: 'text-purple-500 bg-purple-50' },
  SystemNotification: { icon: 'gear', iconStyle: 'solid', color: 'text-orange-500 bg-orange-50' },
  DOCUMENT_FOLLOWUP_RAISED: { icon: 'file-circle-plus', iconStyle: 'solid', color: 'text-amber-500 bg-amber-50' },
  DOCUMENT_FOLLOWUP_RESOLVED: { icon: 'file-circle-check', iconStyle: 'solid', color: 'text-green-500 bg-green-50' },
  DOCUMENT_FOLLOWUP_CANCELLED: { icon: 'file-circle-xmark', iconStyle: 'solid', color: 'text-gray-500 bg-gray-50' },
  DOCUMENT_LINE_ITEM_DECLINED: { icon: 'hand', iconStyle: 'solid', color: 'text-red-500 bg-red-50' },
};
