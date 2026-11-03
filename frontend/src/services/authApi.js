import { apiClient } from './apiClient.js';

/**
 * Đăng ký tài khoản (POST /api/auth/register). Không trả token: người dùng đăng nhập lại sau đó.
 * Trả về { user }.
 */
export function registerAccount({ email, password, confirmPassword }) {
  return apiClient.post('/auth/register', { email, password, confirmPassword }, { auth: false });
}

/**
 * Đăng nhập (POST /api/auth/login). Trả về { token, user }; sai thông tin -> ApiError 401
 * INVALID_CREDENTIALS. Việc lưu token / cập nhật AuthContext do AuthProvider.login() đảm nhiệm.
 */
export function loginAccount({ email, password }) {
  return apiClient.post('/auth/login', { email, password }, { auth: false });
}
