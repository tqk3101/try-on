import { Link } from 'react-router';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { ArrowRightIcon, GridIcon } from '../components/icons.jsx';
import ProfileGate from '../components/tryOn/ProfileGate.jsx';
import { useCategories } from '../features/tryOn/useCategories.js';
import { useTryOnAccess } from '../features/tryOn/useTryOnAccess.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { tryOnRoomPath } from '../routes/paths.js';

function Skeleton({ label }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 rounded-3xl bg-sand" />
        ))}
      </div>
    </div>
  );
}

function CategoryGrid({ categories }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            to={tryOnRoomPath(category.id)}
            className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-blush to-sand p-6 shadow-card transition duration-300 hover:-translate-y-1"
          >
            <span aria-hidden="true" className="font-display text-5xl font-semibold text-accent/30">
              {category.name.charAt(0)}
            </span>
            <span className="flex items-end justify-between gap-3">
              <span className="font-display text-2xl font-semibold text-ink">{category.name}</span>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink transition-colors group-hover:bg-accent group-hover:text-white">
                <ArrowRightIcon />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** /try-on: chọn danh mục (hồ sơ chưa đủ -> màn "Hoàn thiện hồ sơ"). Dữ liệu qua features/tryOn/tryOnApi.js. */
export default function TryOnCategoriesPage() {
  useDocumentTitle('Phòng thử đồ');
  const access = useTryOnAccess();

  if (access.status === 'loading') return <Skeleton label="Đang tải hồ sơ…" />;
  if (access.status === 'error') {
    return (
      <ErrorState title="Không tải được hồ sơ" message={access.error} onRetry={access.reload} />
    );
  }
  if (!access.complete) return <ProfileGate missing={access.missing} />;
  return <CategoryList />;
}

function CategoryList() {
  const { status, categories, error, reload } = useCategories();
  return (
    <section aria-labelledby="try-on-title">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Phòng thử đồ</p>
      <h1 id="try-on-title" className="mt-1 font-display text-3xl font-semibold text-ink">
        Bạn muốn thử gì hôm nay?
      </h1>
      <p className="mb-6 mt-2 text-sm text-ink-soft">
        Chọn một danh mục để xem chính bạn mặc từng sản phẩm.
      </p>

      {status === 'loading' && <Skeleton label="Đang tải danh mục…" />}
      {status === 'error' && (
        <ErrorState title="Không tải được danh mục" message={error} onRetry={reload} />
      )}
      {status === 'empty' && (
        <EmptyState
          icon={<GridIcon />}
          title="Chưa có sản phẩm để thử"
          description="Cửa hàng chưa thêm sản phẩm nào. Vui lòng quay lại sau."
        />
      )}
      {status === 'ready' && <CategoryGrid categories={categories} />}
    </section>
  );
}
