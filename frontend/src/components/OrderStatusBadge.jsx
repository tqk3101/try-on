import { orderStatusLabel } from '../features/orders/orderStatus.js';

const TONES = {
  pending: 'bg-sand text-ink-soft',
  confirmed: 'bg-blush text-accent-dark',
  shipping: 'bg-ink text-white',
  completed: 'bg-gold/20 text-ink',
  cancelled: 'border border-red-200 bg-red-50 text-red-700',
};

/** Badge trạng thái đơn: luôn có chữ (không chỉ dựa vào màu). */
export default function OrderStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        TONES[status] ?? TONES.pending
      }`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
