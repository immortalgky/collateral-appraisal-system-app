import { create } from 'zustand';
import type { Notification } from './types';
import { notificationApi } from './api';

interface NotificationStore {
  notifications: Notification[];
  isLoading: boolean;
  fetchNotifications: (username: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (username: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>(set => ({
  notifications: [],
  isLoading: false,

  fetchNotifications: async (username: string) => {
    set({ isLoading: true });
    try {
      const { data } = await notificationApi.getNotifications(username);
      const notifications = data?.notifications ?? data;
      set({ notifications: Array.isArray(notifications) ? notifications : [] });
    } catch {
      // API error — keep existing notifications
    } finally {
      set({ isLoading: false });
    }
  },

  addNotification: (notification: Notification) =>
    set(state => ({
      notifications: [notification, ...state.notifications],
    })),

  markAsRead: async (id: string) => {
    await notificationApi.markAsRead(id);
    set(state => ({
      notifications: state.notifications.map(n => (n.id === id ? { ...n, isRead: true } : n)),
    }));
  },

  markAllAsRead: async (username: string) => {
    await notificationApi.markAllAsRead(username);
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
    }));
  },
}));
