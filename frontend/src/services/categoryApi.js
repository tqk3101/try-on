import { apiClient } from './apiClient.js';

/** GET /api/categories -> { categories: [{ id, name, slug }] } (chỉ danh mục có sản phẩm). */
export function fetchCategories({ signal } = {}) {
  return apiClient.get('/categories', { signal });
}

/** GET /api/categories/:id/products -> { category, products: [{ id, name, price, imageUrl }] } (cũ nhất trước). */
export function fetchCategoryProducts(categoryId, { signal } = {}) {
  return apiClient.get(`/categories/${encodeURIComponent(categoryId)}/products`, { signal });
}
