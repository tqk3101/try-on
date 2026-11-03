import { useId, useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons.jsx';

const inputBase =
  'block min-h-12 w-full rounded-2xl border bg-surface px-4 text-base text-ink placeholder:text-muted/70 transition-colors focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Ô nhập có nhãn, gợi ý và thông báo lỗi gắn đúng ngữ nghĩa (aria-invalid, aria-describedby).
 * `error` có thể là chuỗi hoặc node (ví dụ kèm liên kết). `type="password"` có nút Hiện/Ẩn.
 * `children` hiển thị ngay dưới ô nhập (ví dụ thanh độ mạnh mật khẩu).
 */
export default function TextField({
  label,
  name,
  type = 'text',
  error,
  hint,
  className = '',
  children,
  ...inputProps
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const isPassword = type === 'password';
  const [revealed, setRevealed] = useState(false);

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          {...inputProps}
          id={id}
          name={name}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy || undefined}
          className={`${inputBase} ${isPassword ? 'pr-12' : ''} ${
            error ? 'border-red-600' : 'border-line hover:border-ink/30'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-2xl text-muted transition-colors hover:text-ink"
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
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
