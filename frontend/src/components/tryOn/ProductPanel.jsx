import { Link } from 'react-router';
import { PATHS } from '../../routes/paths.js';
import { formatVnd } from '../../utils/format.js';
import { ArrowLeftIcon } from '../icons.jsx';

function QuotaLine({ quota }) {
  if (!quota) return null;
  const out = quota.remaining <= 0;
  return (
    <p
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        out ? 'bg-blush text-accent-dark' : 'bg-sand text-ink-soft'
      }`}
    >
      {out ? 'Đã hết lượt hôm nay' : `Còn ${quota.remaining} lượt hôm nay`}
    </p>
  );
}

/**
 * Cột thông tin: danh mục, vị trí "n/N", tên, giá, flat lay thu nhỏ, hạn mức, danh sách thu nhỏ,
 * thẻ "Đã xem hết" ở sản phẩm cuối. Đổi ngay khi chuyển sản phẩm (không chờ mạng).
 * Chừa chỗ cho nút "Thêm vào giỏ" (US-07, Sprint 4): KHÔNG render nút ở Sprint 3 (Q20).
 */
export default function ProductPanel({
  category,
  product,
  index,
  total,
  quota,
  products,
  onSelect,
}) {
  const isLast = index === total - 1;
  return (
    <div className="min-w-0">
      <Link
        to={PATHS.tryOn}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-ink-soft transition-colors hover:text-accent"
      >
        <ArrowLeftIcon width={18} height={18} />
        Chọn danh mục khác
      </Link>

      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
        Phòng thử đồ
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{category.name}</h1>

      <div className="mt-5 flex items-start gap-4">
        <img
          src={product.imageUrl}
          alt={`Ảnh trải phẳng ${product.name}`}
          draggable={false}
          className="aspect-[3/4] w-24 shrink-0 rounded-2xl border border-line bg-surface object-contain p-1"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold tabular-nums text-muted">
            {index + 1}/{total}
          </p>
          <h2 className="mt-1 break-words font-display text-2xl font-semibold leading-snug text-ink">
            {product.name}
          </h2>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink-soft">
            {formatVnd(product.price)}
          </p>
          <div className="mt-3">
            <QuotaLine quota={quota} />
          </div>
        </div>
      </div>

      {/* US-07 (Sprint 4): nút "Thêm vào giỏ" đặt tại đây. */}

      {total > 1 && (
        <nav aria-label="Sản phẩm trong danh mục" className="mt-6">
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {products.map((item, i) => (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-label={`${item.name}, sản phẩm ${i + 1} trên ${total}`}
                  aria-current={i === index ? 'true' : undefined}
                  className={`flex min-h-11 w-14 items-center justify-center rounded-xl border-2 bg-surface p-0.5 transition-colors ${
                    i === index ? 'border-accent' : 'border-line hover:border-ink/40'
                  }`}
                >
                  <img
                    src={item.imageUrl}
                    alt=""
                    draggable={false}
                    className="aspect-[3/4] w-full rounded-lg object-contain"
                  />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {isLast && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p className="font-display text-lg font-semibold text-ink">
            Bạn đã xem hết {category.name}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Đây là sản phẩm cuối cùng. Bấm mũi tên trái để xem lại, hoặc thử danh mục khác.
          </p>
          <Link
            to={PATHS.tryOn}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Chọn danh mục khác
          </Link>
        </div>
      )}
    </div>
  );
}
