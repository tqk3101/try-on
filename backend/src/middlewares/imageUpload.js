import multer from 'multer';
import { HttpError } from './httpError.js';

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const invalidUpload = () => new HttpError(400, 'INVALID_UPLOAD', 'Yêu cầu tải ảnh không hợp lệ.');

/**
 * Tạo middleware nhận multipart với đúng 1 file ở field `field` (xử lý trong bộ nhớ, ≤ 5MB).
 * `limits` bổ sung cho form có field text (ví dụ { fields, fieldSize }).
 * Loại file kiểm tra bằng magic bytes ở service. Đặt SAU requireAuth/requireAdmin và limiter.
 * Map lỗi multer sang envelope chung; không trả err.field/filename (input không tin cậy).
 */
export function createImageUpload({ field, limits = {} }) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: IMAGE_MAX_BYTES, files: 1, ...limits },
  }).single(field);

  return function parseImageUpload(req, res, next) {
    // multer bỏ qua request không phải multipart nên phải chặn trước.
    if (!req.is('multipart/form-data')) return next(invalidUpload());

    upload(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new HttpError(413, 'FILE_TOO_LARGE', 'Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.'),
        );
      }
      // LIMIT_UNEXPECTED_FILE, LIMIT_FILE_COUNT, LIMIT_FIELD_*, lỗi stream/multipart hỏng.
      return next(invalidUpload());
    });
  };
}

/** PUT /api/user/profile/avatar: field `avatar`. */
export const parseAvatarUpload = createImageUpload({ field: 'avatar' });

/** POST/PUT /api/admin/products: field `image` + các field text nhỏ (name, price, categoryId). */
export const parseProductImageUpload = createImageUpload({
  field: 'image',
  limits: { fields: 10, fieldSize: 1024 },
});
