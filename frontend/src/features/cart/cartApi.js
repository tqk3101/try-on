// Điểm nối dữ liệu DUY NHẤT của giỏ hàng: provider, trang và nút "Thêm vào giỏ" chỉ import từ đây.
// Shape: design/flows/cart-and-orders.md mục 2–3. Đang dùng MOCK (mocks/cartMock.js).
//
// TODO(Task5): thay thân từng hàm bằng apiClient (import { apiClient } from '../../services/apiClient.js'),
// giữ nguyên chữ ký và giá trị trả về, rồi xoá mocks/cartMock.js + mocks/mockFlags.js:
//   getCart({ signal })              -> apiClient.get('/cart', { signal })                          => { cart }
//   addCartItem(productId, qty)      -> apiClient.post('/cart/items', { productId, quantity })      => { cart, item }
//   updateCartItem(productId, qty)   -> apiClient.put(`/cart/items/${encodeURIComponent(id)}`, { quantity }) => { cart }
//   removeCartItem(productId)        -> apiClient.delete(`/cart/items/${encodeURIComponent(id)}`)  => { cart }
import {
  mockAddItem,
  mockGetCart,
  mockRemoveItem,
  mockUpdateItem,
} from '../../mocks/cartMock.js';

export const EMPTY_CART = {
  items: [],
  lineCount: 0,
  itemCount: 0,
  total: 0,
  limits: { maxLines: 50, maxQuantity: 10 },
};

/** GET /api/cart -> { cart }. */
export function getCart({ signal } = {}) {
  return mockGetCart({ signal }); // TODO(Task5)
}

/**
 * POST /api/cart/items -> { cart, item, created }.
 * `created` = dòng mới (server trả 201) so với cộng dồn (200); apiClient chỉ trả `data` nên suy ra từ
 * `item.quantity === 1` (thêm mặc định 1 chiếc: dòng mới luôn là 1, cộng dồn luôn >= 2).
 * `hint` ({ name, price, imageUrl, category }) CHỈ để mock; API thật bỏ qua (xoá tham số khi nối).
 */
export async function addCartItem(productId, quantity = 1, hint) {
  const data = await mockAddItem(productId, quantity, hint); // TODO(Task5)
  return { ...data, created: data.item.quantity === quantity };
}

/** PUT /api/cart/items/:productId { quantity } (giá trị tuyệt đối 1–10) -> { cart }. */
export function updateCartItem(productId, quantity) {
  return mockUpdateItem(productId, quantity); // TODO(Task5)
}

/** DELETE /api/cart/items/:productId (idempotent) -> { cart }. */
export function removeCartItem(productId) {
  return mockRemoveItem(productId); // TODO(Task5)
}
