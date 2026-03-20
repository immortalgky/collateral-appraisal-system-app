export type NotificationType =
  | 'task_assigned'
  | 'task_approved'
  | 'pricing_completed'
  | 'appointment'
  | 'system_maintenance'
  | 'deadline_warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  createdAt: string; // ISO string
  isRead: boolean;
}

export const notificationTypeConfig: Record<
  NotificationType,
  { icon: string; iconStyle: 'solid' | 'regular'; color: string }
> = {
  task_assigned: { icon: 'clipboard-list', iconStyle: 'solid', color: 'text-blue-500 bg-blue-50' },
  task_approved: { icon: 'circle-check', iconStyle: 'solid', color: 'text-green-500 bg-green-50' },
  pricing_completed: { icon: 'chart-line', iconStyle: 'solid', color: 'text-purple-500 bg-purple-50' },
  appointment: { icon: 'calendar', iconStyle: 'solid', color: 'text-teal-500 bg-teal-50' },
  system_maintenance: { icon: 'gear', iconStyle: 'solid', color: 'text-orange-500 bg-orange-50' },
  deadline_warning: { icon: 'triangle-exclamation', iconStyle: 'solid', color: 'text-red-500 bg-red-50' },
};
