const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const INVALID_CHARS_MESSAGE = 'Tên chứa ký tự không hợp lệ.';

export function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Chuẩn hoá tên: NFC -> trim -> gộp khoảng trắng liên tiếp thành 1 dấu cách. */
export function normalizeName(raw) {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/**
 * Ký tự thay thế U+FFFD (dấu hiệu lỗi encoding) và ký tự điều khiển (C0/C1)
 * không được phép trong tên.
 */
export function hasInvalidNameChars(name) {
  return /[\uFFFD\p{Cc}]/u.test(name);
}
