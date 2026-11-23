import { apiClient } from './apiClient.js';

/** Danh sách danh mục (GET /api/admin/categories). Trả về { categories: AdminCategory[] }. */
export function fetchAdminCategories() {
  return apiClient.get('/admin/categories');
}

/** Thêm danh mục (POST). payload: { name }. Trả về { category }. */
export function createAdminCategory(payload) {
  return apiClient.post('/admin/categories', payload);
}

/** Đổi tên danh mục (PUT /:id). payload: { name }. Trả về { category } (slug sinh lại). */
export function updateAdminCategory(id, payload) {
  return apiClient.put(`/admin/categories/${encodeURIComponent(id)}`, payload);
}

/** Xoá danh mục (DELETE /:id). Trả về { id }; 409 CATEGORY_NOT_EMPTY nếu còn sản phẩm. */
export function deleteAdminCategory(id) {
  return apiClient.delete(`/admin/categories/${encodeURIComponent(id)}`);
}

/** Danh sách sản phẩm (GET /api/admin/products?categoryId=). Trả về { products: AdminProduct[] }. */
export function fetchAdminProducts({ categoryId } = {}) {
  const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
  return apiClient.get(`/admin/products${query}`);
}

/** Thêm sản phẩm (POST multipart). `formData`: name, price (chuỗi chữ số), categoryId, image. Trả về { product }. */
export function createAdminProduct(formData) {
  return apiClient.post('/admin/products', formData);
}

/** Chi tiết một sản phẩm (GET /:id). Trả về { product }; 404 PRODUCT_NOT_FOUND. */
export function fetchAdminProduct(id) {
  return apiClient.get(`/admin/products/${encodeURIComponent(id)}`);
}

/** Sửa sản phẩm (PUT /:id multipart). `formData`: name, price, categoryId, image (tuỳ chọn). Trả về { product }. */
export function updateAdminProduct(id, formData) {
  return apiClient.put(`/admin/products/${encodeURIComponent(id)}`, formData);
}

/** Xoá sản phẩm (DELETE /:id), xoá luôn ảnh. Trả về { id }; 404 PRODUCT_NOT_FOUND. */
export function deleteAdminProduct(id) {
  return apiClient.delete(`/admin/products/${encodeURIComponent(id)}`);
}

/**
 * Danh sách đơn (GET /api/admin/orders?status=&page=&pageSize=); query chỉ gồm tham số có giá trị.
 * Trả về { orders: AdminOrderSummary[], pagination }.
 */
export function adminListOrders({ status, page, pageSize, signal } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  const query = params.toString();
  return apiClient.get(`/admin/orders${query ? `?${query}` : ''}`, { signal });
}

/** Chi tiết đơn (GET /api/admin/orders/:id). Trả về { order: AdminOrder }; 404 ORDER_NOT_FOUND. */
export function adminGetOrder(id, { signal } = {}) {
  return apiClient.get(`/admin/orders/${encodeURIComponent(id)}`, { signal });
}
