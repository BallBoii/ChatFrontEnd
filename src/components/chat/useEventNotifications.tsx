'use client';

import { create } from 'zustand';
import { EventType } from './EventCard';

export interface EventNotification {
  id: string;
  type: EventType;
  title: string;
  message?: string;
  duration?: number;
}

interface EventNotificationsStore {
  notifications: EventNotification[];
  addNotification: (notification: Omit<EventNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

const useEventNotificationsStore = create<EventNotificationsStore>((set) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = notification.duration ?? 5000;
    
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));

export function useEventNotifications() {
  const { notifications, addNotification, removeNotification } = useEventNotificationsStore();
  
  return {
    notifications,
    addNotification,
    removeNotification,
    // Convenience methods
    success: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'error', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'info', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'warning', title, message, duration }),
  };
}
