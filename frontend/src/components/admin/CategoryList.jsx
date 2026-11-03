import { Link } from 'react-router';
import { PATHS } from '../../routes/paths.js';
import { EditIcon, TrashIcon } from '../icons.jsx';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const productsUrl = (id) => `${PATHS.adminProducts}?categoryId=${encodeURIComponent(id)}`;

function CountBadge({ category }) {
  const label = `${category.productCount} sản phẩm`;
  if (category.productCount === 0) {
    return (
      <span className="inline-flex rounded-full bg-sand px-3 py-1 text-xs font-semibold text-ink-soft">
        {label}
      </span>
    );
  }
  return (
    <Link
      to={productsUrl(category.id)}
      className="inline-flex rounded-full bg-blush px-3 py-1 text-xs font-semibold text-accent-dark hover:underline"
    >
      {label}
    </Link>
  );
}

function RowActions({ category, onEdit, onDelete }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onEdit(category)}
        aria-label={`Sửa danh mục ${category.name}`}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-ink/25 px-3 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5"
      >
        <EditIcon width={18} height={18} />
        <span className="hidden min-[400px]:inline">Sửa</span>
      </button>
      <button
        type="button"
        onClick={() => onDelete(category)}
        aria-label={`Xoá danh mục ${category.name}`}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-accent-dark/40 px-3 text-sm font-semibold text-accent-dark transition-colors hover:bg-blush"
      >
        <TrashIcon width={18} height={18} />
        <span className="hidden min-[400px]:inline">Xoá</span>
      </button>
    </div>
  );
}

const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted';

/** Danh sách danh mục: bảng từ `sm`, thẻ trên mobile. `highlightId` làm nổi dòng vừa thêm/sửa. */
export default function CategoryList({ categories, highlightId, onEdit, onDelete }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-3xl bg-surface shadow-card sm:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Danh sách danh mục</caption>
          <thead className="bg-canvas">
            <tr>
              <th scope="col" className={th}>
                Tên
              </th>
              <th scope="col" className={`${th} hidden md:table-cell`}>
                Đường dẫn (slug)
              </th>
              <th scope="col" className={th}>
                Sản phẩm
              </th>
              <th scope="col" className={th}>
                Ngày tạo
              </th>
              <th scope="col" className={th}>
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr
                key={category.id}
                className={`border-t border-line transition-colors duration-700 ${
                  category.id === highlightId ? 'bg-blush/50' : 'hover:bg-canvas'
                }`}
              >
                <td className="break-words px-4 py-3 font-semibold text-ink">{category.name}</td>
                <td className="hidden px-4 py-3 font-mono text-xs text-muted md:table-cell">
                  {category.slug}
                </td>
                <td className="px-4 py-3">
                  <CountBadge category={category} />
                </td>
                <td className="px-4 py-3 text-sm text-ink-soft">
                  {formatDate(category.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <RowActions category={category} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 sm:hidden">
        {categories.map((category) => (
          <li
            key={category.id}
            className={`rounded-2xl border border-line p-4 transition-colors duration-700 ${
              category.id === highlightId ? 'bg-blush/50' : 'bg-surface'
            }`}
          >
            <p className="break-words font-semibold text-ink">{category.name}</p>
            <div className="mt-2">
              <CountBadge category={category} />
            </div>
            <p className="mt-2 font-mono text-xs text-muted">{category.slug}</p>
            <div className="mt-3">
              <RowActions category={category} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
