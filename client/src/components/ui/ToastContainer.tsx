import { useNotificationStore, type NotificationType } from '../../store/notificationStore';

const TYPE_STYLES: Record<NotificationType, { border: string; text: string; glow: string }> = {
  success: {
    border: 'border-green-500/60',
    text: 'text-green-400',
    glow: 'shadow-[0_0_15px_rgba(0,255,65,0.2)]',
  },
  warning: {
    border: 'border-yellow-500/60',
    text: 'text-yellow-400',
    glow: 'shadow-[0_0_15px_rgba(255,200,0,0.2)]',
  },
  error: {
    border: 'border-red-500/60',
    text: 'text-red-400',
    glow: 'shadow-[0_0_15px_rgba(255,0,80,0.2)]',
  },
  info: {
    border: 'border-cyan-500/60',
    text: 'text-cyan-400',
    glow: 'shadow-[0_0_15px_rgba(0,255,255,0.2)]',
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const style = TYPE_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border bg-[#1a1a2e]/95 backdrop-blur-sm font-mono text-sm animate-slide-in ${style.border} ${style.glow}`}
          >
            {toast.icon && <span className="text-lg">{toast.icon}</span>}
            <span className={style.text}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-gray-500 hover:text-gray-300 text-xs"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
