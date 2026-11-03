import { useState } from 'react';
import { Link } from 'react-router';
import { formatVnd } from '../../utils/format.js';
import { EditIcon, ImageIcon, TrashIcon } from '../icons.jsx';

const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted';

function CategoryBadge({ category }) {
  return (
    <span className="inline-flex rounded-full bg-blush px-3 py-1 text-xs font-semibold text-accent-dark">
      {category?.name ?? 'Không rõ'}
    </span>
  );
}

/**
 * Thumbnail 3:4, object-contain. `imageUrl` null hoặc lỗi tải -> gọi `onImageError()` một lần
 * (trang tải lại danh sách để lấy signed URL mới); vẫn lỗi thì hiện placeholder.
 */
function Thumbnail({ product, widthClass, onImageError }) {
  const [brokenUrl, setBrokenUrl] = useState(null);
  const broken = !product.imageUrl || product.imageUrl === brokenUrl;

  return (
    <div className={`${widthClass} aspect-[3/4] shrink-0 overflow-hidden rounded-xl bg-sand`}>
      {broken ? (
        <div
          role="img"
          aria-label="Không tải được ảnh sản phẩm"
          className="flex h-full flex-col items-center justify-center gap-1 text-center text-muted"
        >
          <ImageIcon width={20} height={20} />
          <span className="text-[10px] leading-tight">Không có ảnh</span>
        </div>
      ) : (
        <img
          src={product.imageUrl}
          alt=""
          loading="lazy"
          onError={() => {
            setBrokenUrl(product.imageUrl);
            onImageError();
          }}
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
}

function RowActions({ product, editUrl, onDelete }) {
  return (
    <div className="flex gap-2">
      <Link
        to={editUrl(product)}
        aria-label={`Sửa sản phẩm ${product.name}`}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-ink/25 px-3 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5"
      >
        <EditIcon width={18} height={18} />
        <span className="hidden min-[400px]:inline">Sửa</span>
      </Link>
      <button
        type="button"
        onClick={() => onDelete(product)}
        aria-label={`Xoá sản phẩm ${product.name}`}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-accent-dark/40 px-3 text-sm font-semibold text-accent-dark transition-colors hover:bg-blush"
      >
        <TrashIcon width={18} height={18} />
        <span className="hidden min-[400px]:inline">Xoá</span>
      </button>
    </div>
  );
}

/**
 * Danh sách sản phẩm: bảng từ `sm`, thẻ trên mobile.
 * `editUrl(product)` trả đường dẫn form sửa (đã giữ bộ lọc); `onDelete(product)` mở hộp thoại xoá.
 */
export default function ProductList({ products, onImageError, editUrl, onDelete }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-3xl bg-surface shadow-card sm:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Danh sách sản phẩm</caption>
          <thead className="bg-canvas">
            <tr>
              <th scope="col" className={`${th} w-24`}>
                Ảnh
              </th>
              <th scope="col" className={th}>
                Tên
              </th>
              <th scope="col" className={`${th} text-right`}>
                Giá
              </th>
              <th scope="col" className={`${th} hidden md:table-cell`}>
                Danh mục
              </th>
              <th scope="col" className={th}>
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-line hover:bg-canvas">
                <td className="px-4 py-3">
                  <Thumbnail product={product} widthClass="w-14" onImageError={onImageError} />
                </td>
                <td className="break-words px-4 py-3 font-semibold text-ink">
                  {product.name}
                  <div className="mt-1 md:hidden">
                    <CategoryBadge category={product.category} />
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink">
                  {formatVnd(product.price)}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <CategoryBadge category={product.category} />
                </td>
                <td className="px-4 py-3">
                  <RowActions product={product} editUrl={editUrl} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 sm:hidden">
        {products.map((product) => (
          <li key={product.id} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
            <Thumbnail product={product} widthClass="w-16" onImageError={onImageError} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 break-words font-semibold text-ink">{product.name}</p>
              <p className="mt-1 tabular-nums text-ink">{formatVnd(product.price)}</p>
              <div className="mt-2">
                <CategoryBadge category={product.category} />
              </div>
              <div className="mt-3">
                <RowActions product={product} editUrl={editUrl} onDelete={onDelete} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
