import { Link } from 'react-router';
import { PATHS } from '../routes/paths.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

/** Trang 403: không tiết lộ nội dung khu vực quản trị. */
export default function ForbiddenPage() {
  useDocumentTitle('Không có quyền truy cập');
  return (
    <section className="py-16 text-center">
      <p className="text-5xl font-bold text-muted">403</p>
      <h1 className="mt-4 text-2xl font-semibold text-ink">Bạn không có quyền truy cập</h1>
      <p className="mt-2 text-ink-soft">Trang này chỉ dành cho quản trị viên.</p>
      <Link
        to={PATHS.home}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
      >
        Về trang chủ
      </Link>
    </section>
  );
}
