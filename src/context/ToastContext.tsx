import React, { createContext, useContext, useState, useCallback } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  Save,
  Check,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000
  icon?: React.ReactNode;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  createdAt: number;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      id = "toast_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      type = "info",
      title,
      message,
      duration = 4000,
      icon,
    }: ToastOptions) => {
      const newToast: ToastItem = {
        id,
        type,
        title,
        message,
        duration,
        icon,
        createdAt: Date.now(),
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Giữ tối đa 5 toast cùng lúc

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const toast = React.useMemo(
    () => ({
      success: (title: string, message?: string, duration?: number) =>
        showToast({ type: "success", title, message, duration }),
      error: (title: string, message?: string, duration?: number) =>
        showToast({ type: "error", title, message, duration }),
      warning: (title: string, message?: string, duration?: number) =>
        showToast({ type: "warning", title, message, duration }),
      info: (title: string, message?: string, duration?: number) =>
        showToast({ type: "info", title, message, duration }),
    }),
    [showToast]
  );

  const contextValue = React.useMemo(
    () => ({ showToast, toast, dismissToast }),
    [showToast, toast, dismissToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast Container Stack */}
      <div
        id="toast-notifications-container"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";
          const isWarning = t.type === "warning";
          const isInfo = t.type === "info";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-200 transform translate-y-0 opacity-100 animate-in slide-in-from-top-3 ${
                isSuccess
                  ? "bg-white/95 border-emerald-300 text-slate-800 shadow-emerald-500/10"
                  : isError
                  ? "bg-white/95 border-rose-300 text-slate-800 shadow-rose-500/10"
                  : isWarning
                  ? "bg-white/95 border-amber-300 text-slate-800 shadow-amber-500/10"
                  : "bg-white/95 border-indigo-300 text-slate-800 shadow-indigo-500/10"
              }`}
            >
              {/* Icon */}
              <div
                className={`p-2 rounded-xl flex-shrink-0 flex items-center justify-center ${
                  isSuccess
                    ? "bg-emerald-100 text-emerald-600"
                    : isError
                    ? "bg-rose-100 text-rose-600"
                    : isWarning
                    ? "bg-amber-100 text-amber-600"
                    : "bg-indigo-100 text-indigo-600"
                }`}
              >
                {t.icon ? (
                  t.icon
                ) : isSuccess ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isError ? (
                  <AlertCircle className="w-5 h-5" />
                ) : isWarning ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              {/* Nội dung thông báo */}
              <div className="flex-1 min-w-0 pr-1">
                <h4
                  className={`font-extrabold text-xs sm:text-sm leading-snug ${
                    isSuccess
                      ? "text-emerald-800"
                      : isError
                      ? "text-rose-800"
                      : isWarning
                      ? "text-amber-800"
                      : "text-indigo-900"
                  }`}
                >
                  {t.title}
                </h4>
                {t.message && (
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">
                    {t.message}
                  </p>
                )}
              </div>

              {/* Nút Đóng */}
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition flex-shrink-0"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
