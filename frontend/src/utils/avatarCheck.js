// Kiểm tra sơ bộ ảnh toàn thân phía client (design/flows/avatar-upload.md mục 1).
// Loại file và dung lượng: CHẶN. Tỉ lệ / kích thước: chỉ CẢNH BÁO. Server vẫn kiểm tra lại (magic bytes).

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_ACCEPT = 'image/jpeg,image/png';

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const RATIOS = [3 / 4, 9 / 16];
const RATIO_TOLERANCE = 0.05;
const MIN_SHORT_SIDE = 720;

export const AVATAR_MESSAGES = {
  type: 'Chỉ hỗ trợ ảnh JPG hoặc PNG.',
  size: 'Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn.',
  unreadable: 'Không đọc được ảnh, vui lòng chọn ảnh khác.',
  warning:
    'Ảnh này có thể chưa phù hợp để thử đồ (nên là ảnh dọc, tỉ lệ 3:4 hoặc 9:16, cạnh ngắn từ 720px).',
};

function hasAllowedExtension(name) {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function loadDimensions(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

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
  if (!ALLOWED_TYPES.includes(file.type) || !hasAllowedExtension(file.name)) {
    return { ok: false, error: AVATAR_MESSAGES.type };
  }
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, error: AVATAR_MESSAGES.size };

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
