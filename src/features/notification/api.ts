import axiosInstance from '@shared/api/axiosInstance';
import type { Notification } from './types';

interface NotificationResponse {
  notifications: Notification[];
}

export const notificationApi = {
  getNotifications: (username: string) =>
    axiosInstance.get<NotificationResponse>(`/notifications/${username}`),

  getUnreadNotifications: (username: string) =>
    axiosInstance.get<NotificationResponse>(`/notifications/${username}/unread`),

  markAsRead: (notificationId: string) =>
    axiosInstance.patch(`/notifications/${notificationId}/read`),

  markAllAsRead: (username: string) =>
    axiosInstance.patch(`/notifications/users/${username}/read-all`),
};
