import { rateLimit } from 'express-rate-limit';
import { HttpError } from './httpError.js';

// Bộ nhớ trong, theo IP: đủ cho 1 instance (design/flows/README.md D8).
// Vượt ngưỡng -> 429 TOO_MANY_REQUESTS cùng envelope lỗi chung; thư viện tự gắn Retry-After.
function createLimiter({ windowMs, limit, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(
        new HttpError(
          429,
          'TOO_MANY_REQUESTS',
          'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.',
        ),
      ),
  });
}

/** Đăng ký: 10 lần / giờ / IP. */
export const registerLimiter = createLimiter({ windowMs: 60 * 60 * 1000, limit: 10 });

/** Đăng nhập: 10 lần thất bại / 15 phút / IP; request thành công không bị tính lượt. */
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});
