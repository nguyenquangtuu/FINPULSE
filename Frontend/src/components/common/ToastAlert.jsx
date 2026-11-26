import React, { useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

export const ToastAlert = () => {
  const { toastAlert, setToastAlert } = useNotifications();

  useEffect(() => {
    if (toastAlert) {
      const timer = setTimeout(() => {
        setToastAlert(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toastAlert, setToastAlert]);

  if (!toastAlert) return null;

  const isWarning = toastAlert.type === 'BUDGET_WARNING';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-bg-surface border border-border-subtle rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-sm shrink-0 ${
            isWarning ? 'bg-status-warning/15 text-status-warning' : 'bg-accent-primary/15 text-accent-primary'
          }`}
        >
          {isWarning ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary truncate">
            {toastAlert.title}
          </h4>
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">
            {toastAlert.content}
          </p>
        </div>

        <button
          onClick={() => setToastAlert(null)}
          className="text-text-secondary hover:text-text-primary p-1 rounded-sm hover:bg-bg-elevated cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
