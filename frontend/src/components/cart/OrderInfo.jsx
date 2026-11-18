import { formatOrderDate, PAYMENT_LABELS } from '../../features/orders/orderStatus.js';
import OrderStatusBadge from '../OrderStatusBadge.jsx';

function Row({ label, children }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

/**
 * Thẻ thông tin đơn dùng chung cho /orders/:id và /admin/orders/:id: mã, ngày, trạng thái, thanh toán,
 * người nhận, SĐT, địa chỉ, ghi chú. `customer` chỉ có ở API admin (thêm dòng "Khách hàng").
 */
export default function OrderInfo({ order }) {
  return (
    <dl className="divide-y divide-line rounded-3xl bg-surface px-6 py-2 shadow-card sm:px-8">
      <Row label="Mã đơn">
        <span className="font-semibold tabular-nums">{order.code}</span>
      </Row>
      <Row label="Ngày đặt">{formatOrderDate(order.createdAt)}</Row>
      <Row label="Trạng thái">
        <OrderStatusBadge status={order.status} />
      </Row>
      <Row label="Thanh toán">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</Row>
      {order.customer && (
        <Row label="Khách hàng">
          {order.customer.displayName ? `${order.customer.displayName} · ` : ''}
          {order.customer.email}
        </Row>
      )}
      <Row label="Người nhận">{order.recipientName}</Row>
      <Row label="Số điện thoại">
        <span className="tabular-nums">{order.phone}</span>
      </Row>
      <Row label="Địa chỉ giao hàng">{order.shippingAddress}</Row>
      <Row label="Ghi chú">
        {order.note ? (
          <span className="whitespace-pre-line">{order.note}</span>
        ) : (
          <span className="text-muted">Không có</span>
        )}
      </Row>
    </dl>
  );
}
