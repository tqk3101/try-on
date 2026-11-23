import { useState } from 'react';
import { Link } from 'react-router';
import { useCart } from '../../features/cart/cartContext.js';
import { addCartItem } from '../../services/cartApi.js';
import { PATHS } from '../../routes/paths.js';
import { BagIcon } from '../icons.jsx';
import { useToast } from '../toastContext.js';

const VIEW_CART = { label: 'Xem giỏ hàng', to: PATHS.cart };

/**
 * Nút "Thêm vào giỏ" của phòng thử đồ (US-07), đặt trong ProductPanel. Dùng `product` đang hiển thị,
 * độc lập với trạng thái ảnh thử đồ. Không cập nhật lạc quan: badge/giỏ chỉ đổi theo `cart` server trả.
 *
 * Không đụng tới điều hướng phòng thử đồ: là <button> thường (Enter/Space), KHÔNG dùng `disabled`
 * khi đang gửi mà dùng `aria-disabled` để không làm mất focus (mất focus -> ←/→ không còn bắt được ở
 * vùng phòng thử đồ). Chuyển sản phẩm khi đang gửi không huỷ request; trạng thái "đang thêm" theo từng
 * sản phẩm; toast nêu đúng tên sản phẩm đã gửi.
 * `onProductMissing()`: gọi khi 404 PRODUCT_NOT_FOUND để trang tải lại danh sách.
 */
export default function AddToCartButton({ product, onProductMissing }) {
  const { cart, applyCart } = useCart();
  const { showToast } = useToast();
  const [pending, setPending] = useState(() => new Set());
  const busy = pending.has(product.id);
  const inCart = cart?.items.find((item) => item.productId === product.id) ?? null;

  async function handleClick() {
    if (busy) return;
    const { id, name } = product;
    setPending((prev) => new Set(prev).add(id));
    try {
      const { cart: next, item, created } = await addCartItem(id, 1);
      applyCart(next);
      if (created) showToast(`Đã thêm ${name} vào giỏ.`, { action: VIEW_CART });
      else showToast(`${name} đã có trong giỏ, số lượng: ${item.quantity}.`, { action: VIEW_CART });
    } catch (error) {
      if (error.status === 401) return; // apiClient xử lý phiên hết hạn
      if (error.code === 'CART_FULL') {
        showToast(error.message, { tone: 'error', action: VIEW_CART });
      } else {
        showToast(error.message, { tone: 'error' });
        if (error.code === 'PRODUCT_NOT_FOUND') onProductMissing?.();
      }
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleClick}
        aria-disabled={busy}
        aria-busy={busy}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-8 text-sm font-semibold text-white transition-colors hover:bg-accent-dark aria-disabled:cursor-wait aria-disabled:opacity-70 aria-disabled:hover:bg-accent sm:w-auto"
      >
        <BagIcon width={20} height={20} />
        {busy ? 'Đang thêm…' : 'Thêm vào giỏ'}
      </button>
      {inCart && (
        <p className="mt-2 text-sm text-ink-soft">
          Đã có {inCart.quantity} trong giỏ.{' '}
          <Link
            to={PATHS.cart}
            className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
          >
            Xem giỏ hàng
          </Link>
        </p>
      )}
    </div>
  );
}
