import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import CheckoutForm from '../components/cart/CheckoutForm.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { useToast } from '../components/toastContext.js';
import { EMPTY_CART, getCart } from '../services/cartApi.js';
import { useCart } from '../features/cart/cartContext.js';
import { placeOrder } from '../services/orderApi.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { orderPath, PATHS } from '../routes/paths.js';
import { fetchProfile } from '../services/userApi.js';

function CheckoutSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Đang tải thông tin đặt hàng…</span>
      <div aria-hidden="true" className="grid animate-pulse gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-5 rounded-3xl bg-surface p-8">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="mb-2 h-4 w-28 rounded bg-sand" />
              <div className="h-12 rounded-2xl bg-sand" />
            </div>
          ))}
        </div>
        <div className="h-72 rounded-3xl bg-sand" />
      </div>
    </div>
  );
}

/**
 * /checkout — đặt hàng (US-10). `idempotencyKey` sinh một lần khi mở trang và GIỮ khi gửi lại (lỗi mạng,
 * 5xx, bấm lại) để server không tạo đơn trùng; tải lại trang / mở lại /checkout thì sinh khoá mới.
 */
export default function CheckoutPage() {
  useDocumentTitle('Đặt hàng');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { applyCart } = useCart();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [load, setLoad] = useState({ status: 'loading', cart: null, profile: null, error: '' });
  const [notice, setNotice] = useState('');
  const placedRef = useRef(false);

  // Giỏ + hồ sơ song song. Hồ sơ chỉ để điền sẵn họ tên/SĐT nên lỗi hồ sơ không chặn đặt hàng.
  const loadData = useCallback(async () => {
    setLoad({ status: 'loading', cart: null, profile: null, error: '' });
    try {
      const [{ cart }, profileResult] = await Promise.all([
        getCart(),
        fetchProfile().catch(() => null),
      ]);
      applyCart(cart);
      setLoad({ status: 'ready', cart, profile: profileResult?.profile ?? null, error: '' });
    } catch (error) {
      if (error.status === 401) return;
      setLoad({ status: 'error', cart: null, profile: null, error: error.message });
    }
  }, [applyCart]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu khi vào trang
    loadData();
  }, [loadData]);

  // Giỏ rỗng (hoặc đã đặt ở tab khác) -> về /cart (EmptyState), trừ khi vừa đặt thành công ở trang này.
  const emptyCart = load.status === 'ready' && load.cart.items.length === 0;
  useEffect(() => {
    if (emptyCart && !placedRef.current) navigate(PATHS.cart, { replace: true });
  }, [emptyCart, navigate]);

  async function handleSubmit(payload) {
    setNotice('');
    try {
      const { order } = await placeOrder({
        idempotencyKey,
        ...payload,
        expectedTotal: load.cart.total,
      });
      placedRef.current = true;
      applyCart(EMPTY_CART); // badge về 0 ngay (server đã làm rỗng giỏ trong cùng transaction)
      navigate(orderPath(order.id), { replace: true, state: { placed: true } });
      return {};
    } catch (error) {
      if (error.status === 401) return {};
      if (error.code === 'VALIDATION_ERROR' && error.fields) return { fieldErrors: error.fields };
      if (error.code === 'CART_CHANGED') {
        // Tải lại giỏ để tóm tắt/tổng tiền đúng; giữ nguyên dữ liệu form (CheckoutForm không remount).
        try {
          const { cart } = await getCart();
          applyCart(cart);
          setLoad((prev) => ({ ...prev, cart }));
        } catch {
          /* giữ tóm tắt cũ; bấm đặt hàng lại sẽ nhận CART_CHANGED tiếp */
        }
        setNotice(error.message); // hiện sau khi tóm tắt đã đúng để thông báo và số tiền khớp nhau
        return {};
      }
      if (error.code === 'CART_EMPTY') {
        showToast(error.message, { tone: 'error' });
        applyCart(EMPTY_CART);
        navigate(PATHS.cart, { replace: true });
        return {};
      }
      // 429 / 500 / NETWORK_ERROR: hiện lỗi trên nút; bấm lại dùng CÙNG idempotencyKey.
      return { formError: error.message };
    }
  }

  let body;
  if (load.status === 'error') {
    body = <ErrorState title="Không tải được thông tin đặt hàng" message={load.error} onRetry={loadData} />;
  } else if (load.status === 'loading' || emptyCart) {
    body = <CheckoutSkeleton />;
  } else {
    body = (
      <CheckoutForm
        cart={load.cart}
        initialValues={{
          recipientName: load.profile?.displayName ?? '',
          phone: load.profile?.phone ?? '',
        }}
        notice={notice}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <section aria-labelledby="checkout-title">
      <h1
        id="checkout-title"
        className="font-display text-3xl font-semibold text-ink"
      >
        Đặt hàng
      </h1>
      <p className="mb-6 mt-2 text-sm text-ink-soft">
        Kiểm tra thông tin giao hàng. Bạn thanh toán khi nhận hàng.
      </p>
      {body}
    </section>
  );
}
