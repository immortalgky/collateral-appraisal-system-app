import toast from 'react-hot-toast';
import Icon from '@shared/components/Icon';
import { notificationTypeConfig } from '../types';
import { timeAgo } from '../utils/timeAgo';
import type { Notification } from '../types';

export function showNotificationToast(notification: Notification) {
  const config = notificationTypeConfig[notification.type] ?? {
    icon: 'bell',
    iconStyle: 'regular' as const,
    color: 'text-gray-500 bg-gray-100',
  };

  toast.custom(
    t => (
      <div
        role="button"
        tabIndex={0}
        className={`flex items-start gap-3 w-[380px] max-w-[90vw] text-left rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-xl ring-1 ring-black/5 cursor-pointer ${
          t.visible ? 'animate-enter' : 'animate-leave'
        }`}
        onClick={() => toast.dismiss(t.id)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toast.dismiss(t.id);
          }
        }}
      >
        <div className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${config.color}`}>
          <Icon name={config.icon} style={config.iconStyle} className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
          <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          className="flex-shrink-0 -mt-1 -mr-1 p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onClick={e => {
            e.stopPropagation();
            toast.dismiss(t.id);
          }}
        >
          ×
        </button>
      </div>
    ),
    { duration: 6000 },
  );
}
