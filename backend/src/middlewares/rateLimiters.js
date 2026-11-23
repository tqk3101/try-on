import { rateLimit } from 'express-rate-limit';
import { HttpError } from './httpError.js';

// Bộ nhớ trong, theo IP: đủ cho 1 instance (design/flows/README.md D8).
// Vượt ngưỡng -> 429 TOO_MANY_REQUESTS cùng envelope lỗi chung; thư viện tự gắn Retry-After.
function createLimiter({
  windowMs,
  limit,
  skipSuccessfulRequests = false,
  requestWasSuccessful,
  keyGenerator,
}) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    ...(requestWasSuccessful && { requestWasSuccessful }),
    ...(keyGenerator && { keyGenerator }),
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

/**
 * Đăng nhập: 10 lần sai / 15 phút / IP. Chỉ 401 (sai thông tin) bị tính lượt; 400 (dữ liệu
 * không hợp lệ), 2xx và lỗi khác được hoàn lại (skipSuccessfulRequests + requestWasSuccessful tuỳ biến).
 */
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode !== 401,
});

/** Avatar (PUT + DELETE dùng chung bộ đếm): 20 lần / 15 phút / user. Đặt sau requireAuth. */
export const avatarLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user.id,
});

/** Thử đồ POST /api/try-on và POST /consent (dùng chung bộ đếm): 20 lần / phút / user. Đặt sau requireAuth. */
export const tryOnLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user.id,
});

/** Thử đồ GET (poll kết quả, quota): 120 lần / phút / user (poll 2 s vẫn dư). Đặt sau requireAuth. */
export const tryOnPollLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator: (req) => req.user.id,
});

/** Giỏ hàng ghi (POST/PUT/DELETE /api/cart/items): 60 lần / phút / user. Đặt sau requireAuth. */
export const cartLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user.id,
});

/** Giỏ hàng đọc (GET /api/cart): 120 lần / phút / user. Đặt sau requireAuth. */
export const cartReadLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator: (req) => req.user.id,
});

/** Ảnh sản phẩm (POST + PUT dùng chung bộ đếm): 60 lần / 15 phút / user. Đặt sau requireAuth. */
export const productImageLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user.id,
});
