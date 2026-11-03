import { useEffect } from 'react';
import { useAuth } from '../auth/authContext.js';

/**
 * PLACEHOLDER (Task 6). Task 7 thay bằng form hồ sơ đầy đủ (tên, số đo, phone, avatar).
 * Lấy `user`/`logout` từ useAuth(); sau logout AuthProvider điều hướng '/' và hiện toast.
 */
export default function ProfilePage() {
  const { user, logout } = useAuth();

  useEffect(() => {
    document.title = 'Hồ sơ — Try-on';
  }, []);

  return (
    <section aria-labelledby="profile-title" className="mx-auto max-w-xl">
      <h1 id="profile-title" className="font-display text-3xl font-semibold text-ink">
        Hồ sơ của tôi
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Chào mừng bạn quay lại. Tính năng chỉnh sửa hồ sơ sẽ sớm có mặt.
      </p>

      <dl className="mt-6 divide-y divide-line rounded-3xl bg-surface p-6 shadow-card sm:p-8">
        <div className="pb-4">
          <dt className="text-sm text-muted">Tên hiển thị</dt>
          <dd className="mt-1 text-base font-medium text-ink">
            {user.displayName || 'Chưa đặt tên'}
          </dd>
        </div>
        <div className="pt-4">
          <dt className="text-sm text-muted">Email</dt>
          <dd className="mt-1 break-all text-base font-medium text-ink">{user.email}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={logout}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-ink/25 px-6 text-sm font-semibold text-ink transition-colors duration-200 hover:border-ink hover:bg-ink/5 sm:w-auto"
      >
        Đăng xuất
      </button>
    </section>
  );
}
