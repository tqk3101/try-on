import { verifyToken } from '../config/jwt.js';
import { HttpError } from './httpError.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = new Set(['user', 'admin']);
const BEARER_REGEX = /^Bearer +(\S+)$/i;

const invalidToken = () => new HttpError(401, 'INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ.');

/**
 * Bảo vệ route: đọc JWT từ header `Authorization: Bearer <token>`, gán `req.user = { id, role }`.
 * Stateless, không truy vấn DB (design/flows/logout-protected-routes.md mục 1).
 */
export function requireAuth(req, res, next) {
  const match = BEARER_REGEX.exec(req.get('authorization') ?? '');
  if (!match) {
    return next(new HttpError(401, 'AUTH_REQUIRED', 'Vui lòng đăng nhập để tiếp tục.'));
  }

  let payload;
  try {
    payload = verifyToken(match[1]);
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return next(
        new HttpError(401, 'TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'),
      );
    }
    return next(invalidToken());
  }

  if (
    typeof payload.sub !== 'string' ||
    !UUID_REGEX.test(payload.sub) ||
    !ROLES.has(payload.role)
  ) {
    return next(invalidToken());
  }

  req.user = { id: payload.sub, role: payload.role };
  next();
}

/** Phân quyền theo role; dùng sau `requireAuth` (dự phòng cho Epic 2). */
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return next(new HttpError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'));
    }
    next();
  };
}
