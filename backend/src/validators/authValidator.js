import { HttpError } from '../middlewares/httpError.js';

// Khớp CHECK profiles_email_format ở DB (migrations/001).
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
// bcrypt chỉ xử lý 72 byte đầu.
const PASSWORD_MAX_LENGTH = 72;
const PASSWORD_MAX_BYTES = 72;

export const MESSAGES = Object.freeze({
  emailRequired: 'Vui lòng nhập email.',
  emailInvalid: 'Email không đúng định dạng.',
  passwordRequired: 'Vui lòng nhập mật khẩu.',
  passwordWeak: 'Mật khẩu cần 8–72 ký tự, gồm chữ thường, chữ hoa và chữ số.',
  confirmMismatch: 'Mật khẩu xác nhận không khớp.',
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Chuẩn hoá email: trim + lowercase. Giá trị không phải string trả về '' */
export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validateEmail(raw) {
  if (raw === undefined || raw === null) return { error: MESSAGES.emailRequired };
  if (typeof raw !== 'string') return { error: MESSAGES.emailInvalid };

  const email = normalizeEmail(raw);
  if (email === '') return { error: MESSAGES.emailRequired };
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(email)) {
    return { error: MESSAGES.emailInvalid };
  }
  return { value: email };
}

function validatePassword(raw) {
  if (raw === undefined || raw === null || raw === '') return { error: MESSAGES.passwordRequired };
  if (typeof raw !== 'string') return { error: MESSAGES.passwordWeak };

  const length = [...raw].length;
  const strongEnough =
    length >= PASSWORD_MIN_LENGTH &&
    length <= PASSWORD_MAX_LENGTH &&
    Buffer.byteLength(raw, 'utf8') <= PASSWORD_MAX_BYTES &&
    /[a-z]/.test(raw) &&
    /[A-Z]/.test(raw) &&
    /[0-9]/.test(raw);
  return strongEnough ? { value: raw } : { error: MESSAGES.passwordWeak };
}

/**
 * Validate body của POST /api/auth/register (design/flows/register.md).
 * Trả về { email, password } đã chuẩn hoá; ném HttpError 400 nếu body sai hoặc có lỗi trường.
 * Trường thừa (role, ...) bị bỏ qua.
 */
export function validateRegisterBody(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, 'BAD_REQUEST', 'Yêu cầu không hợp lệ.');
  }

  const fields = {};
  const email = validateEmail(body.email);
  if (email.error) fields.email = email.error;

  const password = validatePassword(body.password);
  if (password.error) fields.password = password.error;

  // Chỉ so khớp khi cả hai là string; tránh `undefined === undefined` lọt qua.
  if (typeof body.confirmPassword !== 'string' || body.confirmPassword !== body.password) {
    fields.confirmPassword = MESSAGES.confirmMismatch;
  }

  if (Object.keys(fields).length > 0) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
      fields,
    );
  }

  return { email: email.value, password: password.value };
}

/**
 * Validate body của POST /api/auth/login (design/flows/login.md).
 * Chỉ kiểm tra bắt buộc + kiểu string; KHÔNG áp định dạng email hay độ mạnh mật khẩu.
 * Trả về { email, password } (email đã trim + lowercase).
 */
export function validateLoginBody(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, 'BAD_REQUEST', 'Yêu cầu không hợp lệ.');
  }

  const fields = {};
  const email = normalizeEmail(body.email);
  if (email === '') fields.email = MESSAGES.emailRequired;
  if (typeof body.password !== 'string' || body.password === '') {
    fields.password = MESSAGES.passwordRequired;
  }

  if (Object.keys(fields).length > 0) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
      fields,
    );
  }

  return { email, password: body.password };
}
