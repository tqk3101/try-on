// Tập trung đường dẫn.
export const PATHS = {
  home: '/',
  login: '/login',
  register: '/register',
  profile: '/profile',
};

// Trang nào đã có thì bật true để AuthLink render <Link> thật (chưa có thì nút "Sắp ra mắt").
export const AUTH_ROUTES_READY = {
  login: true,
  register: true,
};
