import Icon from '@shared/components/Icon';
import { useNotificationStore } from '../store';
import { notificationTypeConfig } from '../types';
import { timeAgo } from '../utils/timeAgo';
import clsx from 'clsx';

export default function NotificationList() {
  const { notifications, markAsRead } = useNotificationStore();

  return (
    <div className="divide-y divide-gray-100 bg-white rounded-xl ring-1 ring-gray-200">
      {notifications.map(notification => {
        const config = notificationTypeConfig[notification.type];
        return (
          <button
            key={notification.id}
            type="button"
            onClick={() => markAsRead(notification.id)}
            className={clsx(
              'w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl',
              !notification.isRead && 'bg-blue-50/30',
            )}
          >
            <div
              className={clsx(
                'mt-0.5 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                config.color,
              )}
            >
              <Icon name={config.icon} style={config.iconStyle} className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p
                  className={clsx(
                    'text-sm',
                    !notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700',
                  )}
                >
                  {notification.title}
                </p>
                {!notification.isRead && <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
              <p className="text-xs text-gray-400 mt-1.5">{timeAgo(notification.createdAt)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
