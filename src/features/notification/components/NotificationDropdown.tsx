import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '@shared/components/Icon';
import { useNotificationStore } from '../store';
import { notificationTypeConfig } from '../types';
import { timeAgo } from '../utils/timeAgo';
import { useAuthStore } from '@features/auth/store';
import { downloadReportJobPdf } from '@features/reportGeneration/api/reports';
import clsx from 'clsx';

const REPORT_DOWNLOAD_RE = /^\/reports\/jobs\/([^/]+)\/download$/;

export default function NotificationDropdown() {
  const { t } = useTranslation('notification');
  const { notifications, markAsRead, markAllAsRead, fetchNotifications } = useNotificationStore();
  const username = useAuthStore(s => s.user?.username ?? '');
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const recent = notifications.slice(0, 5);

  /**
   * Handle a notification item click.
   * - If actionUrl matches the report download pattern → download PDF via API
   *   (avoids routing to a non-existent page and keeps auth headers).
   * - Otherwise → navigate to actionUrl if present.
   * - Always marks the notification as read.
   */
  async function handleNotificationClick(notificationId: string, actionUrl: string | null) {
    void markAsRead(notificationId);
    if (!actionUrl) return;

    const match = REPORT_DOWNLOAD_RE.exec(actionUrl);
    if (match) {
      const jobId = match[1]!;
      try {
        const blob = await downloadReportJobPdf(jobId);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch {
        toast.error('Failed to download report. It may have expired.');
      }
      return;
    }

    navigate(actionUrl);
  }

  useEffect(() => {
    if (username) {
      fetchNotifications(username);
    }
  }, [username, fetchNotifications]);

  return (
    <Popover className="relative">
      <PopoverButton className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-base-200 text-blue-500 hover:bg-gray-100 dark:hover:bg-base-300 hover:text-blue-600 transition-all focus:outline-none">
        <span className="sr-only">{t('title')}</span>
        <Icon name="bell" style="solid" className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-danger rounded-full ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        className="z-50 mt-2 w-96 rounded-xl bg-white dark:bg-base-200 shadow-lg ring-1 ring-gray-200 dark:ring-base-300 focus:outline-none"
      >
        {({ close }) => (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-base-300">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-base-content">
                  {t('title')}
                </h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium text-white bg-danger rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead(username)}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {t('markAllRead')}
                </button>
              )}
            </div>

            {/* Items */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-base-300">
              {recent.map(notification => {
                const config = notificationTypeConfig[notification.type];
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification.id, notification.actionUrl)}
                    className={clsx(
                      'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-base-300 transition-colors',
                      !notification.isRead && 'bg-blue-50/30',
                    )}
                  >
                    <div
                      className={clsx(
                        'mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                        config.color,
                      )}
                    >
                      <Icon name={config.icon} style={config.iconStyle} className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={clsx(
                            'text-sm truncate',
                            !notification.isRead
                              ? 'font-semibold text-gray-900 dark:text-base-content'
                              : 'font-medium text-gray-700 dark:text-gray-300',
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        {timeAgo(notification.createdAt, t)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 dark:border-base-300">
              <Link
                to="/notifications"
                onClick={() => close()}
                className="block w-full text-center px-4 py-2.5 text-sm font-medium text-primary hover:bg-gray-50 dark:hover:bg-base-300 transition-colors rounded-b-xl"
              >
                {t('viewAll')}
              </Link>
            </div>
          </>
        )}
      </PopoverPanel>
    </Popover>
  );
}
