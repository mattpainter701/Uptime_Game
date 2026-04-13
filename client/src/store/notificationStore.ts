import { create } from 'zustand';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: NotificationType;
  duration: number; // ms
  icon?: string;
}

interface NotificationState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { ...toast, id }], // Keep max 5 toasts
    }));

    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, toast.duration);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// Convenience helpers
export function notify(message: string, type: NotificationType = 'info', icon?: string, duration = 3000) {
  useNotificationStore.getState().addToast({ message, type, duration, icon });
}

export function notifySuccess(message: string, icon?: string) {
  notify(message, 'success', icon);
}

export function notifyError(message: string, icon?: string) {
  notify(message, 'error', icon, 4000);
}

export function notifyWarning(message: string, icon?: string) {
  notify(message, 'warning', icon);
}
