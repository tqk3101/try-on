import { Link, useLocation } from 'react-router';
import { formatOrderDate } from '../../features/orders/orderStatus.js';
import { adminOrderPath } from '../../routes/paths.js';
import { formatVnd } from '../../utils/format.js';
import OrderStatusBadge from '../OrderStatusBadge.jsx';

const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted';

function Customer({ customer }) {
  return (
    <>
      <span className="block font-semibold text-ink">{customer.displayName ?? 'Chưa đặt tên'}</span>
      <span className="block break-all text-sm text-muted">{customer.email}</span>
    </>
  );
}

/**
 * Danh sách đơn cho admin (AdminOrderSummary): bảng từ `sm`, thẻ trên mobile. Không có SĐT/địa chỉ/ghi chú
 * (chỉ ở trang chi tiết). Link mã đơn mang `state.listSearch` để trang chi tiết quay lại đúng ?status&page.
 */
export default function OrderList({ orders }) {
  const { search } = useLocation();
  const linkState = { listSearch: search };

  return (
    <>
      <div className="hidden overflow-hidden rounded-3xl bg-surface shadow-card sm:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Danh sách đơn hàng</caption>
          <thead className="bg-canvas">
            <tr>
              <th scope="col" className={th}>
                Mã đơn
              </th>
              <th scope="col" className={th}>
                Ngày đặt
              </th>
              <th scope="col" className={th}>
                Khách hàng
              </th>
              <th scope="col" className={`${th} hidden lg:table-cell`}>
                Người nhận
              </th>
              <th scope="col" className={`${th} text-right`}>
                Số món
              </th>
              <th scope="col" className={`${th} text-right`}>
                Tổng tiền
              </th>
              <th scope="col" className={th}>
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-line hover:bg-canvas">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link
                    to={adminOrderPath(order.id)}
                    state={linkState}
                    className="inline-flex min-h-11 items-center font-semibold tabular-nums text-accent underline underline-offset-4"
                  >
                    {order.code}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-ink-soft">
                  {formatOrderDate(order.createdAt)}
                </td>
                <td className="max-w-56 px-4 py-3">
                  <Customer customer={order.customer} />
                </td>
                <td className="hidden break-words px-4 py-3 text-ink lg:table-cell">
                  {order.recipientName}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{order.itemCount}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-ink">
                  {formatVnd(order.total)}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 sm:hidden">
        {orders.map((order) => (
          <li key={order.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                to={adminOrderPath(order.id)}
                state={linkState}
                className="inline-flex min-h-11 items-center font-semibold tabular-nums text-accent underline underline-offset-4"
              >
                {order.code}
              </Link>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-sm tabular-nums text-muted">{formatOrderDate(order.createdAt)}</p>
            <div className="mt-2 min-w-0">
              <Customer customer={order.customer} />
            </div>
            <p className="mt-2 text-sm text-ink-soft">Người nhận: {order.recipientName}</p>
            <p className="mt-2 flex items-baseline justify-between text-ink">
              <span className="text-sm text-muted">{order.itemCount} món</span>
              <span className="font-semibold tabular-nums">{formatVnd(order.total)}</span>
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
