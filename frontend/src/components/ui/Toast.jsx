import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from './Icon';

const NOOP = { success: () => {}, error: () => {}, info: () => {} };
const ToastContext = createContext(NOOP);

/** Brief confirmations such as "Bill B-1250 updated" (SRS §25.2). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (tone, message) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
            <Icon name={t.tone === 'success' ? 'success' : t.tone === 'error' ? 'error' : 'info'} size={18} />
            <div className="toast-text">{t.message}</div>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
