import { useId } from 'react';

const base =
  'block min-h-28 w-full rounded-2xl border bg-surface px-4 py-3 text-base text-ink placeholder:text-muted/70 transition-colors focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-60';

/** Ô nhập nhiều dòng cùng kiểu `TextField` (label, hint, lỗi gắn aria). `children` hiện dưới ô. */
export default function TextAreaField({ label, error, hint, className = '', children, ...props }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        {...props}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        className={`${base} ${error ? 'border-red-600' : 'border-line hover:border-ink/30'}`}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}
