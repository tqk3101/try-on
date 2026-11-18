import { pageWindow } from '../utils/pagination.js';

const btn =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors aria-disabled:cursor-not-allowed aria-disabled:opacity-40';
const idle = 'border-ink/25 text-ink hover:border-ink hover:bg-ink/5';

/**
 * Phân trang offset: Trước / số trang / Sau. Ẩn khi chỉ có 1 trang. `onChange(page)`.
 * Từ `sm` hiện dãy số; mobile hiện "Trang n/N" (đỡ chật ở 375px). Nút dùng `aria-disabled` giữ focus.
 */
export default function Pagination({ page, totalPages, onChange, label = 'Phân trang' }) {
  if (totalPages <= 1) return null;
  const go = (n) => {
    if (n >= 1 && n <= totalPages && n !== page) onChange(n);
  };
  return (
    <nav aria-label={label} className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        aria-disabled={page <= 1}
        onClick={() => go(page - 1)}
        className={`${btn} ${idle}`}
      >
        Trang trước
      </button>
      <p className="px-2 text-sm tabular-nums text-ink-soft sm:hidden">
        Trang {page}/{totalPages}
      </p>
      <ul className="hidden items-center gap-2 sm:flex">
        {pageWindow(page, totalPages).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                aria-label={`Trang ${n}`}
                aria-current={n === page ? 'page' : undefined}
                onClick={() => go(n)}
                className={`${btn} tabular-nums ${
                  n === page ? 'border-accent bg-accent text-white' : idle
                }`}
              >
                {n}
              </button>
            </li>
          ),
        )}
      </ul>
      <button
        type="button"
        aria-disabled={page >= totalPages}
        onClick={() => go(page + 1)}
        className={`${btn} ${idle}`}
      >
        Trang sau
      </button>
    </nav>
  );
}
