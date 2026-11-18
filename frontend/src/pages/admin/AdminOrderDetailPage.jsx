import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import OrderInfo from '../../components/cart/OrderInfo.jsx';
import OrderItems from '../../components/cart/OrderItems.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { ArrowLeftIcon, BagIcon } from '../../components/icons.jsx';
import { adminGetOrder } from '../../features/orders/orderApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { PATHS } from '../../routes/paths.js';
import ForbiddenPage from '../ForbiddenPage.jsx';

const backClass =
  'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-ink-soft transition-colors hover:text-accent';

function DetailSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Đang tải đơn hàng…</span>
      <div aria-hidden="true" className="animate-pulse space-y-4">
        <div className="h-80 rounded-3xl bg-sand" />
        <div className="h-48 rounded-3xl bg-sand" />
      </div>
    </div>
  );
}

/** Trang /admin/orders/:id: chi tiết một đơn (có SĐT, địa chỉ, ghi chú, khách). Chỉ xem. */
export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const [phase, setPhase] = useState({ status: 'loading', order: null, error: '' });
  const headingRef = useRef(null);
  useDocumentTitle(phase.order ? `Đơn ${phase.order.code}` : 'Chi tiết đơn hàng');

  // Quay lại danh sách giữ nguyên ?status&page nếu đi từ danh sách.
  const listSearch = typeof state?.listSearch === 'string' ? state.listSearch : '';
  const backTo = `${PATHS.adminOrders}${listSearch}`;

  const load = useCallback(
    async (signal) => {
      setPhase({ status: 'loading', order: null, error: '' });
      try {
        const { order } = await adminGetOrder(id, { signal });
        setPhase({ status: 'ready', order, error: '' });
      } catch (error) {
        if (error.name === 'AbortError' || error.status === 401) return;
        if (error.status === 403) setPhase({ status: 'forbidden', order: null, error: '' });
        else if (error.status === 404) setPhase({ status: 'notfound', order: null, error: '' });
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

  useEffect(() => {
    if (phase.status === 'ready' || phase.status === 'notfound') headingRef.current?.focus();
  }, [phase.status]);

  if (phase.status === 'forbidden') return <ForbiddenPage />;

  const { order } = phase;
  return (
    <section aria-labelledby="admin-order-title">
      <Link to={backTo} className={backClass}>
        <ArrowLeftIcon width={18} height={18} />
        Danh sách đơn hàng
      </Link>
      <h2
        id="admin-order-title"
        ref={headingRef}
        tabIndex={-1}
        className="mb-6 mt-2 text-xl font-semibold text-ink focus:outline-none"
      >
        {order ? (
          <>
            Đơn hàng <span className="tabular-nums">{order.code}</span>
          </>
        ) : (
          'Chi tiết đơn hàng'
        )}
      </h2>

      {phase.status === 'loading' && <DetailSkeleton />}
      {phase.status === 'error' && (
        <ErrorState title="Không tải được đơn hàng" message={phase.error} onRetry={() => load()} />
      )}
      {phase.status === 'notfound' && (
        <EmptyState
          icon={<BagIcon />}
          title="Không tìm thấy đơn hàng"
          description="Đơn hàng không tồn tại hoặc đã bị xoá."
          action={
            <Link
              to={backTo}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
            >
              Về danh sách đơn
            </Link>
          }
        />
      )}
      {phase.status === 'ready' && (
        <>
          <OrderInfo order={order} />
          <h3 className="mb-3 mt-8 font-display text-xl font-semibold text-ink">Sản phẩm</h3>
          <OrderItems items={order.items} itemCount={order.itemCount} total={order.total} />
        </>
      )}
    </section>
  );
}
