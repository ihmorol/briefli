import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Auto dismiss after 5 seconds
const TOAST_DURATION_MS = 5000;

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  // Helper methods for cleaner usage
  return React.useMemo(() => ({
    success: (message: string) => context.addToast('success', message),
    error: (message: string) => context.addToast('error', message),
    warning: (message: string) => context.addToast('warning', message),
    info: (message: string) => context.addToast('info', message),
    remove: context.removeToast
  }), [context]);
};

const TOAST_ICONS = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />
};

const TOAST_STYLES = {
  success: 'bg-emerald-950/90 border-emerald-900',
  error: 'bg-red-950/90 border-red-900',
  warning: 'bg-amber-950/90 border-amber-900',
  info: 'bg-blue-950/90 border-blue-900'
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    const newToast = { id, type, message };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, TOAST_DURATION_MS);
  }, [removeToast]);

  // Stable identity: a fresh object here would defeat every consumer's
  // memoization and re-render the tree on each toast.
  const contextValue = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto 
              flex items-start gap-3 p-4 rounded-lg border shadow-xl backdrop-blur-md
              transform transition-all duration-300 animate-in slide-in-from-bottom-2 fade-in
              ${TOAST_STYLES[toast.type]}
            `}
            role="alert"
          >
            <div className="shrink-0 pt-0.5">
              {TOAST_ICONS[toast.type]}
            </div>
            <p className="flex-1 text-sm text-slate-200 font-medium">
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
