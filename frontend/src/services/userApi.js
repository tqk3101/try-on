import { apiClient } from './apiClient.js';

/** Lấy hồ sơ người dùng hiện tại (GET /api/user/profile, cần token). Trả về { user }. */
export function fetchProfile() {
  return apiClient.get('/user/profile');
}
