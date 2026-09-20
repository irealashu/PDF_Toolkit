import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getStyle = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-emerald-600 text-white border-emerald-700';
      case 'danger':
        return 'bg-red-600 text-white border-red-700';
      case 'warning':
        return 'bg-amber-500 text-white border-amber-600';
      default:
        return 'bg-[#2780e3] text-white border-blue-600';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 shrink-0" />;
      case 'danger':
        return <AlertCircle className="w-5 h-5 shrink-0" />;
      default:
        return <Info className="w-5 h-5 shrink-0" />;
    }
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-lg border text-sm max-w-sm transition-all duration-300 ${getStyle()}`}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-xs uppercase tracking-wide opacity-95">
          {toast.title}
        </div>
        <div className="text-xs mt-0.5 break-words opacity-90">{toast.message}</div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="opacity-70 hover:opacity-100 transition-opacity p-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
