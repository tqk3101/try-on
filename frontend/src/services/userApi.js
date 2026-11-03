import { apiClient } from './apiClient.js';

/** Lấy hồ sơ người dùng hiện tại (GET /api/user/profile, cần token). Trả về { profile } (đầy đủ trường hồ sơ). */
export function fetchProfile() {
  return apiClient.get('/user/profile');
}

/**
 * Cập nhật phần text của hồ sơ (PUT /api/user/profile, JSON).
 * payload: { displayName, phone, heightCm, weightKg } (số là number). Trả về { profile }.
 */
export function updateProfile(payload) {
  return apiClient.put('/user/profile', payload);
}

/** Tải ảnh toàn thân (PUT /api/user/profile/avatar, multipart field "avatar"). Trả về { profile }. */
export function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  return apiClient.put('/user/profile/avatar', formData);
}

/** Xoá ảnh toàn thân (DELETE /api/user/profile/avatar). Trả về { profile } với avatarUrl = null. */
export function deleteAvatar() {
  return apiClient.delete('/user/profile/avatar');
}
