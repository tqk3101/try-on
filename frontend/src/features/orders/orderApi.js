// Điểm nối dữ liệu DUY NHẤT của đơn hàng (người mua + admin). Shape: design/flows/cart-and-orders.md mục 2–3.
// Đang dùng MOCK (mocks/orderMock.js).
//
// TODO(Task5): thay thân từng hàm bằng apiClient, giữ nguyên chữ ký/giá trị trả về, rồi xoá mocks/orderMock.js:
//   placeOrder(body)                  -> apiClient.post('/orders', body)                  => { order }  (201 hoặc 200)
//   getOrder(id, { signal })          -> apiClient.get(`/orders/${encodeURIComponent(id)}`, { signal }) => { order }
//   adminListOrders({ status, page, pageSize, signal })
//        -> apiClient.get(`/admin/orders?${query}`, { signal }) (query chỉ gồm tham số có giá trị) => { orders, pagination }
//   adminGetOrder(id, { signal })     -> apiClient.get(`/admin/orders/${encodeURIComponent(id)}`, { signal }) => { order }
// (Có thể chuyển 2 hàm admin sang services/adminApi.js nếu muốn; cập nhật import ở 2 trang admin.)
import {
  mockAdminGetOrder,
  mockAdminListOrders,
  mockGetOrder,
  mockPlaceOrder,
} from '../../mocks/orderMock.js';

/**
 * POST /api/orders. body: { idempotencyKey, recipientName, phone, shippingAddress, note?, expectedTotal }.
 * Lỗi: 400 VALIDATION_ERROR (fields), 409 CART_EMPTY / CART_CHANGED, 429, 500, NETWORK_ERROR.
 */
export function placeOrder(body) {
  return mockPlaceOrder(body); // TODO(Task5)
}

/** GET /api/orders/:id -> { order }; 404 ORDER_NOT_FOUND. */
export function getOrder(id, { signal } = {}) {
  return mockGetOrder(id, { signal }); // TODO(Task5)
}

/** GET /api/admin/orders -> { orders: AdminOrderSummary[], pagination }. */
export function adminListOrders({ status, page, pageSize, signal } = {}) {
  return mockAdminListOrders({ status, page, pageSize, signal }); // TODO(Task5)
}

/** GET /api/admin/orders/:id -> { order: AdminOrder }; 404 ORDER_NOT_FOUND. */
export function adminGetOrder(id, { signal } = {}) {
  return mockAdminGetOrder(id, { signal }); // TODO(Task5)
}
