import { create } from 'zustand';
import { mockNotifications } from './data/mockNotifications';
import type { Notification } from './types';

interface NotificationStore {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  toggleRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>(set => ({
  notifications: mockNotifications,

  markAsRead: (id: string) =>
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
    })),

  markAllAsRead: () =>
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
    })),

  toggleRead: (id: string) =>
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, isRead: !n.isRead } : n,
      ),
    })),
}));
