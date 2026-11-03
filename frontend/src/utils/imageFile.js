// Kiểm tra file ảnh phía client dùng chung (ảnh toàn thân và ảnh sản phẩm).
// Server vẫn kiểm tra lại bằng magic bytes; đây chỉ để phản hồi sớm cho người dùng.

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_ACCEPT = 'image/jpeg,image/png';

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

export const IMAGE_MESSAGES = {
  type: 'Chỉ hỗ trợ ảnh JPG hoặc PNG.',
  size: 'Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn.',
  unreadable: 'Không đọc được ảnh, vui lòng chọn ảnh khác.',
};

/** Loại (MIME + đuôi file) và dung lượng. Trả message lỗi, hoặc '' nếu đạt. */
export function checkTypeAndSize(file) {
  const lower = file.name.toLowerCase();
  const typeOk =
    ALLOWED_TYPES.includes(file.type) && ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!typeOk) return IMAGE_MESSAGES.type;
  if (file.size > IMAGE_MAX_BYTES) return IMAGE_MESSAGES.size;
  return '';
}

/** Đọc kích thước ảnh từ objectURL; trả null nếu trình duyệt không giải mã được. */
export function loadDimensions(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
