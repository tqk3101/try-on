import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToastContext } from './toastContext.js';

const DURATION_MS = 4000;

/** Toast tối giản: một thông báo tại một thời điểm, tự ẩn sau vài giây (aria-live polite). */
export default function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);

  const showToast = useCallback((text) => {
    clearTimeout(timerRef.current);
    setMessage(text);
    timerRef.current = setTimeout(() => setMessage(''), DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
      >
        {message && (
          <p className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-card">
            {message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
