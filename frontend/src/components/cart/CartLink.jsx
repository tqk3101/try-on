import { Link } from 'react-router';
import { useCart } from '../../features/cart/cartContext.js';
import { PATHS } from '../../routes/paths.js';
import { BagIcon } from '../icons.jsx';
import { formatBadgeCount } from './formatBadgeCount.js';

/**
 * Liên kết "Giỏ hàng" ở header: icon túi + badge `itemCount` (ẩn khi 0). Chỉ render khi đã đăng nhập
 * (nơi dùng quyết định). Tên truy cập luôn có số ("Giỏ hàng, 3 sản phẩm") nên không dựa vào màu/badge.
 */
export default function CartLink({ className = '' }) {
  const { itemCount } = useCart();
  return (
    <Link
      to={PATHS.cart}
      aria-label={itemCount > 0 ? `Giỏ hàng, ${itemCount} sản phẩm` : 'Giỏ hàng'}
      className={`relative inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 ${className}`}
    >
      <BagIcon />
      {itemCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold leading-5 text-white tabular-nums"
        >
          {formatBadgeCount(itemCount)}
        </span>
      )}
    </Link>
  );
}
