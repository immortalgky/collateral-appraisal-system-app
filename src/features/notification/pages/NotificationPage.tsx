import { useNotificationStore } from '../store';
import NotificationList from '../components/NotificationList';

export default function NotificationPage() {
  const { notifications, markAllAsRead } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                {notifications.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">View and manage your notifications</p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="px-1">
        <NotificationList />
      </div>
    </div>
  );
}
