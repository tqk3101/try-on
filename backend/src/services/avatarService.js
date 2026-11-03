import { HttpError } from '../middlewares/httpError.js';
import {
  getAvatarPath,
  getProfile,
  removeAvatarObject,
  setAvatarPath,
  uploadAvatarObject,
} from './userService.js';

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Nhận diện loại ảnh bằng magic bytes (không tin mimetype/tên file client gửi). */
export function detectImageType(buffer) {
  if (buffer.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  if (buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    return { ext: 'png', contentType: 'image/png' };
  }
  return null;
}

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
  await uploadAvatarObject(newPath, file.buffer, type.contentType);

  let profile;
  try {
    profile = await setAvatarPath(userId, newPath);
  } catch (err) {
    await removeAvatarObject(newPath);
    throw err;
  }

  if (oldPath && oldPath !== newPath) await removeAvatarObject(oldPath);
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
  await removeAvatarObject(oldPath);
  return profile;
}
