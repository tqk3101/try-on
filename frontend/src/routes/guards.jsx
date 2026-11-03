import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { useAuth } from '../auth/authContext.js';
import { PATHS } from './paths.js';
import { safeRedirect } from './safeRedirect.js';

function FullPageSpinner() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center bg-canvas">
      <span
        aria-hidden="true"
        className="size-10 animate-spin rounded-full border-4 border-line border-t-accent"
      />
      <span className="sr-only">Đang kiểm tra phiên đăng nhập…</span>
    </div>
  );
}

function SessionError({ onRetry }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-4 text-center">
      <p role="alert" className="max-w-sm text-base text-ink">
        Không thể kiểm tra phiên đăng nhập lúc này. Vui lòng kiểm tra kết nối và thử lại.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
      >
        Thử lại
      </button>
    </div>
  );
}

/** Route cần đăng nhập (layout route). */
export function RequireAuth() {
  const { status, logoutKey, expiredFor, retry } = useAuth();
  const { pathname, search, key } = useLocation();

  if (status === 'checking') return <FullPageSpinner />;
  if (status === 'error') return <SessionError onRetry={retry} />;
  if (status === 'guest') {
    // Vừa đăng xuất từ chính trang này: về trang chủ (không phải /login).
    if (logoutKey === key) return <Navigate to={PATHS.home} replace />;
    const current = `${pathname}${search}`;
    const redirect = encodeURIComponent(current);
    // Phiên vừa hết hạn giữa chừng ngay tại trang này: giữ reason=expired để hiện banner.
    const reason = expiredFor === current ? '&reason=expired' : '';
    return <Navigate to={`${PATHS.login}?redirect=${redirect}${reason}`} replace />;
  }
  return <Outlet />;
}

/** Route chỉ dành cho khách (/login, /register). */
export function GuestOnly() {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'checking') return <FullPageSpinner />;
  if (status === 'authenticated') {
    return <Navigate to={safeRedirect(searchParams.get('redirect')) ?? PATHS.profile} replace />;
  }
  return <Outlet />;
}
