// API giỏ hàng (US-07/US-08). Shape: design/flows/cart-and-orders.md mục 2–3. Provider, trang và nút
// "Thêm vào giỏ" chỉ import từ đây. Mọi hàm trả `data` của envelope (apiClient ném ApiError khi lỗi).
import { apiClient } from './apiClient.js';

export const EMPTY_CART = {
  items: [],
  lineCount: 0,
  itemCount: 0,
  total: 0,
  limits: { maxLines: 50, maxQuantity: 10 },
};

const itemPath = (productId) => `/cart/items/${encodeURIComponent(productId)}`;

/** GET /api/cart -> { cart }. */
export function getCart({ signal } = {}) {
  return apiClient.get('/cart', { signal });
}

/**
 * POST /api/cart/items -> { cart, item, created }.
 * `created` = dòng mới (server trả 201) so với cộng dồn (200); apiClient chỉ trả `data` nên suy ra từ
 * `item.quantity === quantity` (dòng mới luôn đúng bằng số vừa thêm, cộng dồn luôn lớn hơn).
 */
export async function addCartItem(productId, quantity = 1) {
  const data = await apiClient.post('/cart/items', { productId, quantity });
  return { ...data, created: data.item.quantity === quantity };
}

/** PUT /api/cart/items/:productId { quantity } (giá trị tuyệt đối 1–10) -> { cart }. */
export function updateCartItem(productId, quantity) {
  return apiClient.put(itemPath(productId), { quantity });
}

/** DELETE /api/cart/items/:productId (idempotent) -> { cart }. */
export function removeCartItem(productId) {
  return apiClient.delete(itemPath(productId));
}
