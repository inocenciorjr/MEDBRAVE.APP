'use client';

import { useToast, Toast } from '@/lib/contexts/ToastContext';

const TOAST_ICONS = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const TOAST_COLORS = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-400 text-green-800 dark:text-green-300',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-400 text-red-800 dark:text-red-300',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 dark:border-amber-400 text-amber-800 dark:text-amber-300',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 text-blue-800 dark:text-blue-300',
};

const TOAST_ICON_COLORS = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
};

function ToastItem({ toast }: { toast: Toast }) {
  const { hideToast } = useToast();

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 ${TOAST_COLORS[toast.type]}`}
      role="alert"
    >
      <span className={`material-symbols-outlined text-2xl flex-shrink-0 ${TOAST_ICON_COLORS[toast.type]}`} style={{ fontVariationSettings: '"FILL" 1' }}>
        {TOAST_ICONS[toast.type]}
      </span>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm">{toast.title}</h4>
        {toast.message && (
          <p className="text-xs mt-1 opacity-90">{toast.message}</p>
        )}
      </div>

      <button
        onClick={() => hideToast(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="Fechar"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      <div className="pointer-events-auto space-y-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
}
