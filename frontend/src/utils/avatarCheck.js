// Kiểm tra sơ bộ ảnh toàn thân phía client (design/flows/avatar-upload.md mục 1).
// Loại file và dung lượng: CHẶN. Tỉ lệ / kích thước: chỉ CẢNH BÁO. Server vẫn kiểm tra lại (magic bytes).

import {
  checkTypeAndSize,
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
  IMAGE_MESSAGES,
  loadDimensions,
} from './imageFile.js';

export const AVATAR_MAX_BYTES = IMAGE_MAX_BYTES;
export const AVATAR_ACCEPT = IMAGE_ACCEPT;

const RATIOS = [3 / 4, 9 / 16];
const RATIO_TOLERANCE = 0.05;
const MIN_SHORT_SIDE = 720;

export const AVATAR_MESSAGES = {
  ...IMAGE_MESSAGES,
  warning:
    'Ảnh này có thể chưa phù hợp để thử đồ (nên là ảnh dọc, tỉ lệ 3:4 hoặc 9:16, cạnh ngắn từ 720px).',
};

/** Ảnh dọc, tỉ lệ rộng/cao gần 3:4 hoặc 9:16 (±0.05), cạnh ngắn >= 720px. */
export function isRecommendedSize(width, height) {
  if (!(height > width)) return false;
  const ratio = width / height;
  const ratioOk = RATIOS.some((target) => Math.abs(ratio - target) <= RATIO_TOLERANCE);
  return ratioOk && Math.min(width, height) >= MIN_SHORT_SIDE;
}

/**
 * Trả về:
 *  - { ok: false, error }  -> bỏ file.
 *  - { ok: true, previewUrl, warning }  -> `warning` là chuỗi rỗng nếu ảnh đạt chuẩn.
 * NGƯỜI GỌI sở hữu `previewUrl` và phải gọi URL.revokeObjectURL khi đổi ảnh / bỏ ảnh / unmount.
 */
export async function checkAvatarFile(file) {
  const basicError = checkTypeAndSize(file);
  if (basicError) return { ok: false, error: basicError };

  const previewUrl = URL.createObjectURL(file);
  const size = await loadDimensions(previewUrl);
  if (!size) {
    URL.revokeObjectURL(previewUrl);
    return { ok: false, error: AVATAR_MESSAGES.unreadable };
  }
  return {
    ok: true,
    previewUrl,
    warning: isRecommendedSize(size.width, size.height) ? '' : AVATAR_MESSAGES.warning,
  };
}
