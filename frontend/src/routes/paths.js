// Tập trung đường dẫn.
export const PATHS = {
  home: '/',
  login: '/login',
  register: '/register',
  profile: '/profile',
  tryOn: '/try-on',
  tryOnRoom: '/try-on/:categoryId',
  admin: '/admin',
  adminCategories: '/admin/categories',
  adminProducts: '/admin/products',
  adminProductNew: '/admin/products/new',
};

export const adminProductEditPath = (id) => `/admin/products/${encodeURIComponent(id)}/edit`;

export const tryOnRoomPath = (categoryId) => `/try-on/${encodeURIComponent(categoryId)}`;

/** Thêm `?categoryId=` (nếu có) vào một đường dẫn admin để giữ bộ lọc danh mục. */
export const withCategoryFilter = (path, categoryId) =>
  categoryId ? `${path}?categoryId=${encodeURIComponent(categoryId)}` : path;

// Trang nào đã có thì bật true để AuthLink render <Link> thật (chưa có thì nút "Sắp ra mắt").
export const AUTH_ROUTES_READY = {
  login: true,
  register: true,
};
