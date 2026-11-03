import jwt from 'jsonwebtoken';
import { env } from './env.js';

const ALGORITHM = 'HS256';

/** Tạo JWT từ payload; secret và TTL lấy từ env. */
export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { algorithm: ALGORITHM, expiresIn: env.jwtExpiresIn });
}

/**
 * Xác thực JWT, trả về payload.
 * Chỉ chấp nhận HS256 (chặn alg khác / none).
 * Ném JsonWebTokenError / TokenExpiredError nếu token không hợp lệ hoặc hết hạn.
 */
export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
}
