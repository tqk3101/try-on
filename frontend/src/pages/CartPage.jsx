import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import CartLine from '../components/cart/CartLine.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { BagIcon } from '../components/icons.jsx';
import { useToast } from '../components/toastContext.js';
import { removeCartItem, updateCartItem } from '../features/cart/cartApi.js';
import { useCart } from '../features/cart/cartContext.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { PATHS } from '../routes/paths.js';
import { formatVnd } from '../utils/format.js';

const primaryLink =
  'inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-white transition-colors hover:bg-accent-dark';
const outlineLink =
  'inline-flex min-h-12 w-full items-center justify-center rounded-full border border-ink/25 px-8 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5';

function CartSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Đang tải giỏ hàng…</span>
      <div aria-hidden="true" className="grid animate-pulse gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4 rounded-2xl bg-surface p-4">
              <div className="aspect-[3/4] w-20 rounded-xl bg-sand sm:w-24" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 w-2/3 rounded bg-sand" />
                <div className="h-4 w-1/4 rounded bg-sand" />
                <div className="h-11 w-36 rounded-full bg-sand" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-56 rounded-3xl bg-sand" />
      </div>
    </div>
  );
}

/** /cart — xem và sửa giỏ hàng (US-08). Dữ liệu qua features/cart (CartProvider + cartApi). */
export default function CartPage() {
  useDocumentTitle('Giỏ hàng');
  const { showToast } = useToast();
  const { cart, status, error, refresh, applyCart } = useCart();
  const [removing, setRemoving] = useState(() => new Set());
  const headingRef = useRef(null);
  const hadCartRef = useRef(cart !== null);

  // Luôn lấy giỏ mới nhất khi mở trang (giữ giỏ đang có thì nạp nền, không nháy skeleton).
  useEffect(() => {
    refresh({ silent: hadCartRef.current });
  }, [refresh]);

  const handleUpdate = useCallback(
    async (productId, quantity) => {
      try {
        const data = await updateCartItem(productId, quantity);
        applyCart(data.cart);
        return true;
      } catch (err) {
        if (err.status === 401) return false;
        if (err.code === 'CART_ITEM_NOT_FOUND') {
          showToast('Sản phẩm không còn trong giỏ.', { tone: 'error' });
          refresh({ silent: true });
        } else {
          showToast(err.message, { tone: 'error' });
        }
        return false;
      }
    },
    [applyCart, refresh, showToast],
  );

  async function handleRemove(item) {
    setRemoving((prev) => new Set(prev).add(item.productId));
    try {
      const data = await removeCartItem(item.productId);
      applyCart(data.cart);
      showToast(`Đã xoá ${item.name}.`);
      // Dòng vừa xoá mang theo focus: đưa focus về tiêu đề để bàn phím/đọc màn hình không bị mất vị trí.
      headingRef.current?.focus();
    } catch (err) {
      if (err.status !== 401) showToast(err.message, { tone: 'error' });
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(item.productId);
        return next;
      });
    }
  }

  let body;
  if (!cart && status === 'error') {
    body = <ErrorState title="Không tải được giỏ hàng" message={error} onRetry={() => refresh()} />;
  } else if (!cart) {
    body = <CartSkeleton />;
  } else if (cart.items.length === 0) {
    body = (
      <EmptyState
        icon={<BagIcon />}
        title="Giỏ hàng trống"
        description="Hãy vào phòng thử đồ, ưng món nào thì thêm vào giỏ."
        action={
          <Link to={PATHS.tryOn} className={`${primaryLink} sm:w-auto`}>
            Vào phòng thử đồ
          </Link>
        }
      />
    );
  } else {
    body = (
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <ul aria-label="Sản phẩm trong giỏ" className="space-y-3">
          {cart.items.map((item) => (
            <CartLine
              key={item.productId}
              item={item}
              maxQuantity={cart.limits.maxQuantity}
              removing={removing.has(item.productId)}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))}
        </ul>

        <aside
          aria-label="Tóm tắt giỏ hàng"
          className="rounded-3xl bg-surface p-6 shadow-card lg:sticky lg:top-6"
        >
          <h2 className="font-display text-xl font-semibold text-ink">Tóm tắt</h2>
          <div aria-live="polite" className="mt-4 space-y-2 text-sm">
            <p className="flex justify-between text-ink-soft">
              <span>Số lượng</span>
              <span className="tabular-nums">{cart.itemCount} sản phẩm</span>
            </p>
            <p className="flex items-baseline justify-between border-t border-line pt-3 text-ink">
              <span className="font-semibold">Tổng tiền</span>
              <span className="text-xl font-semibold tabular-nums">{formatVnd(cart.total)}</span>
            </p>
          </div>
          <p className="mt-3 text-xs text-muted">
            Giá có thể thay đổi; giá cuối cùng được chốt khi bạn đặt hàng. Chưa gồm phí vận chuyển.
          </p>
          <div className="mt-5 space-y-3">
            <Link to={PATHS.checkout} className={primaryLink}>
              Đặt hàng
            </Link>
            <Link to={PATHS.tryOn} className={outlineLink}>
              Tiếp tục thử đồ
            </Link>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <section aria-labelledby="cart-title">
      <h1
        id="cart-title"
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-3xl font-semibold text-ink focus:outline-none"
      >
        Giỏ hàng
      </h1>
      <div className="mt-6">{body}</div>
    </section>
  );
}
