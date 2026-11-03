// Cùng bộ quy tắc với backend (backend/src/validators/authValidator.js,
// design/flows/register.md). Server vẫn là nơi quyết định cuối cùng.

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const PASSWORD_MAX_BYTES = 72;

export const MESSAGES = {
  emailRequired: 'Vui lòng nhập email.',
  emailInvalid: 'Email không đúng định dạng.',
  passwordRequired: 'Vui lòng nhập mật khẩu.',
  passwordWeak: 'Mật khẩu cần 8–72 ký tự, gồm chữ thường, chữ hoa và chữ số.',
  confirmMismatch: 'Mật khẩu xác nhận không khớp.',
};

/** Các điều kiện bắt buộc của mật khẩu (dùng cho validate và danh sách gợi ý). */
export const PASSWORD_RULES = [
  { id: 'length', label: '8–72 ký tự', test: (pw) => isValidLength(pw) },
  { id: 'lower', label: 'Chữ thường (a–z)', test: (pw) => /[a-z]/.test(pw) },
  { id: 'upper', label: 'Chữ hoa (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'digit', label: 'Chữ số (0–9)', test: (pw) => /[0-9]/.test(pw) },
];

function isValidLength(password) {
  const length = [...password].length;
  return (
    length >= PASSWORD_MIN_LENGTH &&
    length <= PASSWORD_MAX_LENGTH &&
    new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES
  );
}

export function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (email === '') return MESSAGES.emailRequired;
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(email)) return MESSAGES.emailInvalid;
  return '';
}

export function validatePassword(value) {
  if (value === '') return MESSAGES.passwordRequired;
  return PASSWORD_RULES.every((rule) => rule.test(value)) ? '' : MESSAGES.passwordWeak;
}

export function validateConfirmPassword(password, confirmPassword) {
  return confirmPassword !== '' && confirmPassword === password ? '' : MESSAGES.confirmMismatch;
}

/** Trả về { tênTrường: message } chỉ gồm các trường lỗi; object rỗng nghĩa là hợp lệ. */
export function validateRegisterForm({ email, password, confirmPassword }) {
  const errors = {
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: validateConfirmPassword(password, confirmPassword),
  };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message !== ''));
}

/** Độ mạnh mật khẩu 0–6: 4 điều kiện bắt buộc + ký tự đặc biệt + độ dài >= 12. */
export function getPasswordStrength(password) {
  if (password === '') return { score: 0, label: '' };
  let score = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if ([...password].length >= 12) score += 1;

  if (score <= 2) return { score, label: 'Yếu' };
  if (score <= 4) return { score, label: 'Trung bình' };
  if (score === 5) return { score, label: 'Khá' };
  return { score, label: 'Mạnh' };
}

/** Đăng nhập: chỉ kiểm tra bắt buộc + định dạng email; KHÔNG áp quy tắc độ mạnh mật khẩu (login.md). */
export function validateLoginForm({ email, password }) {
  const errors = {
    email: validateEmail(email),
    password: password === '' ? MESSAGES.passwordRequired : '',
  };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message !== ''));
}
