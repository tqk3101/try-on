import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToastContext } from './toastContext.js';
import { AlertIcon } from './icons.jsx';

const DURATION_MS = { default: 4000, error: 6000 };

/**
 * Toast tối giản: một thông báo tại một thời điểm, tự ẩn sau vài giây.
 * `showToast(text, { tone })`: 'default' (aria-live polite, 4s) hoặc 'error' (assertive, 6s).
 */
export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((text, { tone = 'default' } = {}) => {
    clearTimeout(timerRef.current);
    const resolvedTone = tone === 'error' ? 'error' : 'default';
    setToast({ text, tone: resolvedTone });
    timerRef.current = setTimeout(() => setToast(null), DURATION_MS[resolvedTone]);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const isError = toast?.tone === 'error';

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
      >
        {toast && (
          <p
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white shadow-card ${
              isError ? 'bg-accent-dark' : 'bg-ink'
            }`}
          >
            {isError && <AlertIcon width={18} height={18} />}
            {toast.text}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
