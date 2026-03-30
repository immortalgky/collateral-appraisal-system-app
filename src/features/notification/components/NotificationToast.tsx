import toast from 'react-hot-toast';
import Icon from '@shared/components/Icon';
import { notificationTypeConfig } from '../types';
import { timeAgo } from '../utils/timeAgo';
import type { Notification } from '../types';

const typeBackground: Record<string, string> = {
  TaskAssigned: 'bg-gray-50 border-blue-400',
  TaskCompleted: 'bg-gray-50 border-green-400',
  WorkflowTransition: 'bg-gray-50 border-purple-400',
  SystemNotification: 'bg-gray-50 border-amber-400',
};

export function showNotificationToast(notification: Notification) {
  const config = notificationTypeConfig[notification.type];
  const bg = typeBackground[notification.type] ?? 'bg-white border-gray-200';

  toast(
    t => (
      <button
        type="button"
        className={`flex items-start gap-3 w-full text-left rounded-xl border px-4 py-3 shadow-sm ${bg}`}
        onClick={() => toast.dismiss(t.id)}
      >
        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
          <Icon name={config.icon} style={config.iconStyle} className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
          <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
        </div>
      </button>
    ),
    {
      duration: 6000,
      style: {
        maxWidth: '380px',
        padding: 0,
        background: 'transparent',
        boxShadow: 'none',
      },
    },
  );
}
