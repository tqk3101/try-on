import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ToastContext } from './toastContext.js';
import { AlertIcon } from './icons.jsx';

const DURATION_MS = { default: 4000, error: 6000, withAction: 7000 };

/**
 * Toast tối giản: một thông báo tại một thời điểm, tự ẩn sau vài giây.
 * `showToast(text, { tone, action })`: 'default' (aria-live polite, 4s) hoặc 'error' (assertive, 6s).
 * `action` ({ label, to }) thêm một liên kết trong toast (vd. "Xem giỏ hàng"); toast có liên kết giữ 7s.
 */
export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((text, { tone = 'default', action } = {}) => {
    clearTimeout(timerRef.current);
    const resolvedTone = tone === 'error' ? 'error' : 'default';
    setToast({ text, tone: resolvedTone, action: action ?? null });
    timerRef.current = setTimeout(
      () => setToast(null),
      action ? DURATION_MS.withAction : DURATION_MS[resolvedTone],
    );
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
            className={`flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-3xl px-5 py-3 text-sm font-medium text-white shadow-card ${
              isError ? 'bg-accent-dark' : 'bg-ink'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {isError && <AlertIcon width={18} height={18} />}
              {toast.text}
            </span>
            {toast.action && (
              <Link
                to={toast.action.to}
                onClick={() => setToast(null)}
                className="pointer-events-auto inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:outline-white"
              >
                {toast.action.label}
              </Link>
            )}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
