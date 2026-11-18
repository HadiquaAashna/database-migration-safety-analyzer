import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, type, title, message, duration };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    addToast('success', title, message);
  }, [addToast]);

  const showError = useCallback((title: string, message?: string) => {
    addToast('error', title, message, 4500);
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    addToast('warning', title, message);
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    addToast('info', title, message);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {/* Toast Notification Container */}
      <div 
        aria-live="polite" 
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 flex flex-col gap-2 max-w-[94vw] sm:max-w-md w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3 rounded-lg border shadow-lg transition-all duration-200 transform translate-y-0 flex items-start gap-2.5 font-sans animate-in fade-in slide-in-from-top-2 ${
                isSuccess
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                  : isError
                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                  : isWarning
                  ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]'
                  : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#15803D]" />}
                {isError && <AlertOctagon className="w-4 h-4 text-[#DC2626]" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-[#D97706]" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-[#2563EB]" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold leading-snug break-words">
                  {toast.title}
                </div>
                {toast.message && (
                  <div className="text-[11px] text-[#4B5563] mt-0.5 leading-tight break-words">
                    {toast.message}
                  </div>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded hover:bg-black/5 text-[#6B7280] hover:text-[#111827] cursor-pointer transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
