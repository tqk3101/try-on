import { PATHS } from './paths.js';

const BLOCKED_PATHS = [PATHS.login, PATHS.register];

/**
 * Chỉ chấp nhận đường dẫn nội bộ (design/flows/README.md D11) để chống open redirect.
 * Trả về path hợp lệ hoặc null.
 */
export function safeRedirect(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return null;
  if (value.startsWith('//') || value.startsWith('/\\')) return null;

  const pathname = value.split(/[?#]/)[0];
  if (BLOCKED_PATHS.includes(pathname)) return null;
  return value;
}
