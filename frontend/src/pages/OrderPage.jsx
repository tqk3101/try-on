import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import OrderInfo from '../components/cart/OrderInfo.jsx';
import OrderItems from '../components/cart/OrderItems.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { BagIcon, CheckIcon } from '../components/icons.jsx';
import { getOrder } from '../features/orders/orderApi.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { PATHS } from '../routes/paths.js';

const primaryLink =
  'inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-white transition-colors hover:bg-accent-dark';

function OrderSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Đang tải đơn hàng…</span>
      <div aria-hidden="true" className="animate-pulse space-y-4">
        <div className="h-72 rounded-3xl bg-sand" />
        <div className="h-48 rounded-3xl bg-sand" />
      </div>
    </div>
  );
}

/**
 * /orders/:id — xác nhận / xem đơn của chính mình (US-10). Tiêu đề "Đặt hàng thành công" chỉ khi vừa
 * đến từ /checkout (router state `{ placed: true }`); vào lại thì tiêu đề "Đơn hàng DH…".
 * 404 ORDER_NOT_FOUND gồm cả đơn của người khác (không lộ sự tồn tại).
 */
export default function OrderPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const justPlaced = state?.placed === true;
  const [phase, setPhase] = useState({ status: 'loading', order: null, error: '' });
  const headingRef = useRef(null);
  useDocumentTitle(
    phase.order ? `Đơn hàng ${phase.order.code}` : phase.status === 'notfound' ? 'Không tìm thấy đơn' : 'Đơn hàng',
  );

  const load = useCallback(
    async (signal) => {
      setPhase({ status: 'loading', order: null, error: '' });
      try {
        const { order } = await getOrder(id, { signal });
        setPhase({ status: 'ready', order, error: '' });
      } catch (error) {
        if (error.name === 'AbortError' || error.status === 401) return;
        if (error.status === 404) setPhase({ status: 'notfound', order: null, error: '' });
        else setPhase({ status: 'error', order: null, error: error.message });
      }
    },
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu khi vào trang
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Đưa focus vào tiêu đề khi nội dung sẵn sàng để trình đọc màn hình đọc kết quả đặt hàng.
  useEffect(() => {
    if (phase.status === 'ready' || phase.status === 'notfound') headingRef.current?.focus();
  }, [phase.status]);

  const { order } = phase;
  return (
    <section aria-labelledby="order-title">
      {phase.status === 'loading' && (
        <>
          <h1 id="order-title" className="font-display text-3xl font-semibold text-ink">
            Đơn hàng
          </h1>
          <div className="mt-6">
            <OrderSkeleton />
          </div>
        </>
      )}

      {phase.status === 'error' && (
        <>
          <h1 id="order-title" className="font-display text-3xl font-semibold text-ink">
            Đơn hàng
          </h1>
          <div className="mt-6">
            <ErrorState
              title="Không tải được đơn hàng"
              message={phase.error}
              onRetry={() => load()}
            />
          </div>
        </>
      )}

      {phase.status === 'notfound' && (
        <>
          <h1
            id="order-title"
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-3xl font-semibold text-ink focus:outline-none"
          >
            Đơn hàng
          </h1>
          <div className="mt-6">
            <EmptyState
              icon={<BagIcon />}
              title="Không tìm thấy đơn hàng"
              description="Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn."
              action={
                <Link to={PATHS.tryOn} className={primaryLink}>
                  Vào phòng thử đồ
                </Link>
              }
            />
          </div>
        </>
      )}

      {phase.status === 'ready' && (
        <>
          {justPlaced && (
            <div className="mb-6 flex items-start gap-4 rounded-3xl bg-blush p-6">
              <span
                aria-hidden="true"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-white"
              >
                <CheckIcon />
              </span>
              <div>
                <h1
                  id="order-title"
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-3xl font-semibold text-ink focus:outline-none"
                >
                  Đặt hàng thành công
                </h1>
                <p className="mt-1 text-ink-soft">
                  Mã đơn của bạn là <span className="font-semibold tabular-nums">{order.code}</span>.
                  Bạn thanh toán khi nhận hàng.
                </p>
              </div>
            </div>
          )}
          {!justPlaced && (
            <h1
              id="order-title"
              ref={headingRef}
              tabIndex={-1}
              className="mb-6 font-display text-3xl font-semibold text-ink focus:outline-none"
            >
              Đơn hàng <span className="tabular-nums">{order.code}</span>
            </h1>
          )}

          <OrderInfo order={order} />
          <h2 className="mb-3 mt-8 font-display text-xl font-semibold text-ink">Sản phẩm</h2>
          <OrderItems items={order.items} itemCount={order.itemCount} total={order.total} />

          <div className="mt-8">
            <Link to={PATHS.tryOn} className={primaryLink}>
              Tiếp tục thử đồ
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
