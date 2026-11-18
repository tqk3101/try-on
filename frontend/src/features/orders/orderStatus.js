// Trạng thái đơn hàng (design/flows/cart-and-orders.md mục 2). Sprint 4 chỉ tạo `pending`; đủ 5 giá trị
// để bộ lọc admin và badge không phải đổi khi bổ sung đổi trạng thái (Q29).
export const ORDER_STATUSES = [
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn tất' },
  { value: 'cancelled', label: 'Đã huỷ' },
];

export const isOrderStatus = (value) => ORDER_STATUSES.some((status) => status.value === value);

export function orderStatusLabel(value) {
  return ORDER_STATUSES.find((status) => status.value === value)?.label ?? value;
}

export const PAYMENT_LABELS = { cod: 'Thanh toán khi nhận hàng (COD)' };

/** "2026-11-18T03:05:00Z" -> "18/11/2026 10:05" (giờ máy người xem). */
export function formatOrderDate(iso) {
  const date = new Date(iso);
  const day = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}
