import { Link } from 'react-router';
import { AUTH_ROUTES_READY, PATHS } from '../routes/paths.js';

const VARIANTS = {
  primary: 'bg-accent text-white hover:bg-accent-dark',
  outline: 'border border-ink/25 text-ink hover:border-ink hover:bg-ink/5',
  light: 'bg-white text-accent-dark hover:bg-blush',
};

const PILL_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors duration-200';
const TEXT_BASE =
  'font-semibold text-accent underline underline-offset-4 transition-colors hover:text-accent-dark';

/**
 * Liên kết tới /login hoặc /register (to = 'login' | 'register').
 * Variant `text` là liên kết chữ gạch chân nằm trong câu; còn lại là nút bo tròn.
 * `redirect` (đường dẫn nội bộ đã qua safeRedirect) được giữ trong query `?redirect=`.
 * Khi trang đích chưa có (AUTH_ROUTES_READY[to] = false), render nút vô hiệu hoá kèm chú thích
 * "Sắp ra mắt" để không dẫn người dùng tới 404.
 */
export default function AuthLink({
  to,
  variant = 'primary',
  compact = false,
  className = '',
  redirect,
  children,
}) {
  const isText = variant === 'text';
  const classes = `${isText ? TEXT_BASE : `${PILL_BASE} ${VARIANTS[variant]}`} ${className}`;

  if (AUTH_ROUTES_READY[to]) {
    return (
      <Link
        to={redirect ? `${PATHS[to]}?redirect=${encodeURIComponent(redirect)}` : PATHS[to]}
        className={classes}
      >
        {children}
      </Link>
    );
  }

  if (isText) {
    return <span className={`font-semibold text-ink-soft ${className}`}>{children}</span>;
  }

  return (
    <button
      type="button"
      aria-disabled="true"
      title="Tính năng sắp ra mắt"
      onClick={(e) => e.preventDefault()}
      className={`${classes} cursor-not-allowed opacity-75`}
    >
      {children}
      <span
        className={
          compact ? 'sr-only' : 'rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-medium'
        }
      >
        {compact ? '(sắp ra mắt)' : 'Sắp ra mắt'}
      </span>
    </button>
  );
}
