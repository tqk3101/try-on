import { HttpError } from '../middlewares/httpError.js';

const DISPLAY_NAME_MAX_LENGTH = 50;
// Số di động VN sau chuẩn hoá (design/flows/profile.md).
const PHONE_REGEX = /^0[35789][0-9]{8}$/;
const HEIGHT_RANGE = Object.freeze({ min: 100, max: 250 });
const WEIGHT_RANGE = Object.freeze({ min: 30, max: 250 });

export const MESSAGES = Object.freeze({
  displayNameTooLong: 'Tên hiển thị tối đa 50 ký tự.',
  displayNameInvalid: 'Tên hiển thị không hợp lệ.',
  phoneInvalid: 'Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (ví dụ 0912345678).',
  heightRequired: 'Vui lòng nhập chiều cao.',
  heightRange: 'Chiều cao phải từ 100 đến 250 cm.',
  weightRequired: 'Vui lòng nhập cân nặng.',
  weightRange: 'Cân nặng phải từ 30 đến 250 kg.',
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateDisplayName(raw) {
  if (raw === undefined || raw === null) return { value: null };
  if (typeof raw !== 'string') return { error: MESSAGES.displayNameInvalid };
  const name = raw.trim();
  if (name === '') return { value: null };
  if ([...name].length > DISPLAY_NAME_MAX_LENGTH) return { error: MESSAGES.displayNameTooLong };
  return { value: name };
}

/** Chuẩn hoá SĐT: bỏ khoảng trắng . - ( ), đầu +84 hoặc 84 -> 0. */
export function normalizePhone(raw) {
  const compact = raw.replace(/[\s.()-]/g, '');
  if (compact.startsWith('+84')) return `0${compact.slice(3)}`;
  if (compact.startsWith('84')) return `0${compact.slice(2)}`;
  return compact;
}

function validatePhone(raw) {
  if (raw === undefined || raw === null) return { value: null };
  if (typeof raw !== 'string') return { error: MESSAGES.phoneInvalid };
  if (raw.trim() === '') return { value: null };
  const phone = normalizePhone(raw);
  return PHONE_REGEX.test(phone) ? { value: phone } : { error: MESSAGES.phoneInvalid };
}

// Số đo: bắt buộc, JSON number hữu hạn; làm tròn 1 chữ số thập phân rồi mới kiểm tra khoảng.
function validateMeasurement(raw, { min, max }, requiredMessage, rangeMessage) {
  if (raw === undefined || raw === null || raw === '') return { error: requiredMessage };
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return { error: rangeMessage };
  const rounded = Math.round(raw * 10) / 10;
  return rounded >= min && rounded <= max ? { value: rounded } : { error: rangeMessage };
}

/**
 * Validate body của PUT /api/user/profile (design/flows/profile.md).
 * Trả về { displayName, phone, heightCm, weightKg } đã chuẩn hoá; ném HttpError 400 nếu sai.
 * Trường lạ (email, role, avatarUrl, id, password...) bị bỏ qua.
 */
export function validateProfileBody(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, 'BAD_REQUEST', 'Yêu cầu không hợp lệ.');
  }

  const displayName = validateDisplayName(body.displayName);
  const phone = validatePhone(body.phone);
  const heightCm = validateMeasurement(
    body.heightCm,
    HEIGHT_RANGE,
    MESSAGES.heightRequired,
    MESSAGES.heightRange,
  );
  const weightKg = validateMeasurement(
    body.weightKg,
    WEIGHT_RANGE,
    MESSAGES.weightRequired,
    MESSAGES.weightRange,
  );

  const fields = {};
  if (displayName.error) fields.displayName = displayName.error;
  if (phone.error) fields.phone = phone.error;
  if (heightCm.error) fields.heightCm = heightCm.error;
  if (weightKg.error) fields.weightKg = weightKg.error;

  if (Object.keys(fields).length > 0) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
      fields,
    );
  }

  return {
    displayName: displayName.value,
    phone: phone.value,
    heightCm: heightCm.value,
    weightKg: weightKg.value,
  };
}
