export type NotificationType = 'TaskAssigned' | 'TaskCompleted' | 'WorkflowTransition' | 'SystemNotification';

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
};
