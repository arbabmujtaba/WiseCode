import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { cls: 'alert-success', Icon: CheckCircle2 },
  error: { cls: 'alert-error', Icon: XCircle },
  warning: { cls: 'alert-warning', Icon: TriangleAlert },
  info: { cls: 'alert-info', Icon: Info },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, message, duration = 4000) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-3), { id, type, message }]);
      if (duration) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (m, d) => push('success', m, d),
      error: (m, d) => push('error', m, d ?? 6000),
      warning: (m, d) => push('warning', m, d),
      info: (m, d) => push('info', m, d),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast toast-end toast-bottom z-[100]" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map(({ id, type, message }) => {
          const { cls, Icon } = STYLES[type] || STYLES.info;
          return (
            <div key={id} role="status" className={`alert ${cls} animate-toast-in max-w-sm shadow-lg`}>
              <Icon size={18} aria-hidden="true" />
              <span className="text-sm break-words">{message}</span>
              <button className="btn btn-ghost btn-xs btn-circle" onClick={() => dismiss(id)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
