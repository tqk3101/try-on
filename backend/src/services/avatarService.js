import { HttpError } from '../middlewares/httpError.js';
import { detectImageType } from '../utils/image.js';
import { removeObject, uploadObject } from './storageService.js';
import { deleteTryOnResultsOfProfile } from './tryOn/cleanup.js';
import { AVATAR_BUCKET, getAvatarPath, getProfile, setAvatarPath } from './userService.js';

/**
 * PUT /api/user/profile/avatar (design/flows/avatar-upload.md mục 2).
 * Upload -> cập nhật DB -> xoá ảnh cũ (best-effort); DB lỗi thì dọn object vừa upload.
 */
export async function replaceAvatar(userId, file) {
  const type = detectImageType(file.buffer);
  if (!type) {
    throw new HttpError(415, 'UNSUPPORTED_FILE_TYPE', 'Chỉ hỗ trợ ảnh JPG hoặc PNG.');
  }

  const oldPath = await getAvatarPath(userId);
  // Tên file do server tạo, không dùng originalname.
  const newPath = `${userId}/avatar-${Date.now()}.${type.ext}`;
  await uploadObject(AVATAR_BUCKET, newPath, file.buffer, type.contentType);

  let profile;
  try {
    profile = await setAvatarPath(userId, newPath);
  } catch (err) {
    await removeObject(AVATAR_BUCKET, newPath);
    throw err;
  }

  if (oldPath && oldPath !== newPath) await removeObject(AVATAR_BUCKET, oldPath);
  // Ảnh thử đồ cũ chứa hình người dùng cũ: dọn rows + object (best-effort).
  await deleteTryOnResultsOfProfile(userId);
  return profile;
}

/**
 * DELETE /api/user/profile/avatar (avatar-upload.md mục 4): idempotent.
 * Cập nhật DB trước, xoá object sau để avatar_path không bao giờ trỏ tới file đã mất.
 */
export async function removeAvatar(userId) {
  const oldPath = await getAvatarPath(userId);
  if (!oldPath) return getProfile(userId); // chưa có ảnh: không gọi Storage

  const profile = await setAvatarPath(userId, null);
  await removeObject(AVATAR_BUCKET, oldPath);
  await deleteTryOnResultsOfProfile(userId);
  return profile;
}
