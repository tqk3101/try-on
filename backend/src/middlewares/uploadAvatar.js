import multer from 'multer';
import { HttpError } from './httpError.js';

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const invalidUpload = () => new HttpError(400, 'INVALID_UPLOAD', 'Yêu cầu tải ảnh không hợp lệ.');

// Xử lý trong bộ nhớ; field "avatar", tối đa 1 file. Loại file kiểm tra bằng magic bytes ở service.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
}).single('avatar');

/**
 * Middleware nhận multipart cho PUT /api/user/profile/avatar (đặt SAU requireAuth và limiter).
 * Map lỗi multer sang envelope chung; không trả err.filename (input không tin cậy).
 */
export function parseAvatarUpload(req, res, next) {
  // multer bỏ qua request không phải multipart nên phải chặn trước.
  if (!req.is('multipart/form-data')) return next(invalidUpload());

  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new HttpError(413, 'FILE_TOO_LARGE', 'Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.'),
      );
    }
    // LIMIT_UNEXPECTED_FILE, LIMIT_FILE_COUNT, mã khác và lỗi stream/multipart hỏng.
    return next(invalidUpload());
  });
}
