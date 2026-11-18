import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import OrderList from '../../components/admin/OrderList.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { BagIcon } from '../../components/icons.jsx';
import Pagination from '../../components/Pagination.jsx';
import SelectField from '../../components/SelectField.jsx';
import { adminListOrders } from '../../features/orders/orderApi.js';
import { isOrderStatus, ORDER_STATUSES } from '../../features/orders/orderStatus.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { PATHS } from '../../routes/paths.js';
import ForbiddenPage from '../ForbiddenPage.jsx';

const PAGE_SIZE = 20;

function ListSkeleton() {
  return (
    <div role="status" className="animate-pulse space-y-3">
      <span className="sr-only">Đang tải đơn hàng…</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} aria-hidden="true" className="flex gap-4 rounded-2xl bg-surface p-4">
          <div className="h-5 w-24 rounded bg-sand" />
          <div className="h-5 flex-1 rounded bg-sand" />
          <div className="hidden h-5 w-24 rounded bg-sand sm:block" />
        </div>
      ))}
    </div>
  );
}

const outlineClass =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-ink/25 px-6 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink/5';

/** Trang /admin/orders: đơn hàng phân trang, lọc theo trạng thái; trạng thái ở URL `?status=&page=`. */
export default function AdminOrdersPage() {
  useDocumentTitle('Quản lý đơn hàng');
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get('status');
  const rawPage = searchParams.get('page');
  const status = rawStatus && isOrderStatus(rawStatus) ? rawStatus : '';
  const pageValid = rawPage === null || /^[1-9]\d{0,5}$/.test(rawPage);
  const page = rawPage !== null && pageValid ? Number(rawPage) : 1;

  const [state, setState] = useState({ phase: 'loading', orders: [], pagination: null, error: '' });
  const [retry, setRetry] = useState(0);
  const headingRef = useRef(null);

  // Tham số sai trên URL (status lạ, page không phải số dương): bỏ và tải lại (flow mục 9).
  useEffect(() => {
    if ((rawStatus !== null && status === '') || !pageValid) {
      setSearchParams(status ? { status } : {}, { replace: true });
    }
  }, [rawStatus, status, pageValid, setSearchParams]);

  useEffect(() => {
    if (!pageValid || (rawStatus !== null && status === '')) return undefined;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đổi bộ lọc/trang thì tải lại
    setState((prev) => ({ ...prev, phase: 'loading' }));
    adminListOrders({
      status: status || undefined,
      page,
      pageSize: PAGE_SIZE,
      signal: controller.signal,
    })
      .then(({ orders, pagination }) => {
        setState({ phase: 'ready', orders, pagination, error: '' });
      })
      .catch((error) => {
        if (error.name === 'AbortError' || error.status === 401) return;
        if (error.status === 403) setState({ phase: 'forbidden', orders: [], pagination: null, error: '' });
        else if (error.code === 'VALIDATION_ERROR') setSearchParams({}, { replace: true });
        else setState({ phase: 'error', orders: [], pagination: null, error: error.message });
      });
    return () => controller.abort();
  }, [status, page, rawStatus, pageValid, retry, setSearchParams]);

  // `page` vượt totalPages (đơn bị đổi/lọc): server trả danh sách rỗng -> nhảy về trang cuối.
  const { phase, orders, pagination } = state;
  useEffect(() => {
    if (phase === 'ready' && orders.length === 0 && pagination.total > 0 && page > 1) {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(Math.max(1, pagination.totalPages)));
      setSearchParams(next, { replace: true });
    }
  }, [phase, orders.length, pagination, page, searchParams, setSearchParams]);

  const changeStatus = useCallback(
    (event) => {
      const value = event.target.value;
      setSearchParams(value ? { status: value } : {});
    },
    [setSearchParams],
  );

  const changePage = useCallback(
    (nextPage) => {
      const next = new URLSearchParams();
      if (status) next.set('status', status);
      if (nextPage > 1) next.set('page', String(nextPage));
      setSearchParams(next);
      headingRef.current?.focus();
      window.scrollTo({ top: 0 });
    },
    [setSearchParams, status],
  );

  if (phase === 'forbidden') return <ForbiddenPage />;

  const filtering = status !== '';
  const isEmpty = phase === 'ready' && orders.length === 0 && pagination.total === 0;

  return (
    <section aria-labelledby="admin-orders-title">
      <h2
        id="admin-orders-title"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold text-ink focus:outline-none"
      >
        Đơn hàng
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Đơn người mua đã đặt, mới nhất trước. Hiện chỉ xem, chưa đổi được trạng thái.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SelectField
          label="Lọc theo trạng thái"
          placeholder="Tất cả trạng thái"
          value={status}
          onChange={changeStatus}
          options={ORDER_STATUSES}
          className="w-full sm:w-72"
        />
        <p aria-live="polite" className="text-sm text-ink-soft">
          {phase === 'loading'
            ? 'Đang tải…'
            : phase === 'ready'
              ? `${pagination.total} đơn`
              : ''}
        </p>
      </div>

      <div className="mt-6">
        {phase === 'loading' && <ListSkeleton />}
        {phase === 'error' && (
          <ErrorState
            title="Không tải được đơn hàng"
            message={state.error}
            onRetry={() => setRetry((n) => n + 1)}
          />
        )}
        {isEmpty && (
          <EmptyState
            icon={<BagIcon />}
            title={filtering ? 'Không có đơn ở trạng thái này' : 'Chưa có đơn hàng nào'}
            description={
              filtering
                ? 'Thử chọn trạng thái khác hoặc xem tất cả đơn.'
                : 'Đơn sẽ xuất hiện ở đây khi người mua đặt hàng.'
            }
            action={
              filtering ? (
                <Link to={PATHS.adminOrders} className={outlineClass}>
                  Xem tất cả
                </Link>
              ) : undefined
            }
          />
        )}
        {phase === 'ready' && orders.length > 0 && (
          <>
            <OrderList orders={orders} />
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onChange={changePage}
              label="Phân trang đơn hàng"
            />
          </>
        )}
      </div>
    </section>
  );
}
