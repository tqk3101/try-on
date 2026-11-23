// API đơn hàng của người mua (US-10, US-09). Shape: design/flows/cart-and-orders.md mục 2–3.
import { apiClient } from './apiClient.js';

/**
 * POST /api/orders. body: { idempotencyKey, recipientName, phone, shippingAddress, note?, expectedTotal }.
 * -> { order } (201 đơn mới hoặc 200 gửi lại cùng khoá).
 * Lỗi: 400 VALIDATION_ERROR (fields), 409 CART_EMPTY / CART_CHANGED, 429, 500, NETWORK_ERROR.
 */
export function placeOrder(body) {
  return apiClient.post('/orders', body);
}

/** GET /api/orders/:id -> { order }; 404 ORDER_NOT_FOUND. */
export function getOrder(id, { signal } = {}) {
  return apiClient.get(`/orders/${encodeURIComponent(id)}`, { signal });
}
